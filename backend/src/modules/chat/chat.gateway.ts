import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

type SocketWithUser = Socket & {
  data: Socket['data'] & { userId?: string };
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: SocketWithUser): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new BadRequestException('Missing auth token');
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get('jwt.accessSecret') || 'access-secret',
      });

      client.data.userId = payload.sub;
      const channels = await this.chatService.listChannels(payload.sub);
      await Promise.all(channels.map((channel) => client.join(this.channelRoom(channel.id))));
      this.logger.debug(`Chat socket connected: ${client.id}`);
    } catch (error) {
      this.logger.warn(`Chat socket rejected: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: SocketWithUser): void {
    this.logger.debug(`Chat socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join_channel')
  async joinChannel(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { channelId?: string },
  ) {
    if (!client.data.userId || !payload?.channelId) {
      return;
    }

    await this.chatService.assertChannelAccess(payload.channelId, client.data.userId);
    await client.join(this.channelRoom(payload.channelId));
  }

  @SubscribeMessage('chat:leave_channel')
  async leaveChannel(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { channelId?: string },
  ) {
    if (!payload?.channelId) {
      return;
    }

    await client.leave(this.channelRoom(payload.channelId));
  }

  @SubscribeMessage('chat:send_message')
  async sendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { channelId?: string; message?: SendMessageDto },
  ) {
    if (!client.data.userId || !payload?.channelId || !payload?.message) {
      return;
    }

    const message = await this.chatService.sendMessage(
      payload.channelId,
      client.data.userId,
      payload.message,
    );

    this.emitNewMessage(payload.channelId, message);
    return message;
  }

  @SubscribeMessage('chat:read')
  async markRead(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { channelId?: string; messageId?: string },
  ) {
    if (!client.data.userId || !payload?.channelId || !payload?.messageId) {
      return;
    }

    await this.chatService.markRead(payload.channelId, payload.messageId, client.data.userId);

    this.emitUnreadUpdated(payload.channelId, client.data.userId, payload.messageId);
  }

  emitNewMessage(channelId: string, message: unknown): void {
    this.server.to(this.channelRoom(channelId)).emit('chat:new_message', message);
  }

  emitUnreadUpdated(channelId: string, userId: string, messageId: string): void {
    this.server.to(this.channelRoom(channelId)).emit('chat:unread_updated', {
      channelId,
      userId,
      messageId,
    });
  }

  private extractToken(client: SocketWithUser): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (!header) {
      return null;
    }

    const [schema, token] = header.split(' ');
    if (schema?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token.trim();
  }

  private channelRoom(channelId: string): string {
    return `chat:channel:${channelId}`;
  }
}
