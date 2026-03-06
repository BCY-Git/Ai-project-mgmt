import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { User } from '@/entities/user.entity';
import { Project } from '@/entities/project.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatChannel } from './entities/chat-channel.entity';
import { ChatChannelMember } from './entities/chat-channel-member.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatAttachment } from './entities/chat-attachment.entity';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      Project,
      ChatChannel,
      ChatChannelMember,
      ChatMessage,
      ChatAttachment,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
