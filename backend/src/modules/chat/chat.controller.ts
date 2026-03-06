import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/entities/user.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { SetPinDto } from './dto/set-pin.dto';

type UploadedChatFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('contacts')
  @ApiOperation({ summary: 'List contacts for chat module' })
  async listContacts(@CurrentUser() user: User) {
    return this.chatService.listContacts(user.id);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List channels that current user joined' })
  async listChannels(@CurrentUser() user: User) {
    return this.chatService.listChannels(user.id);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create a new chat channel' })
  async createChannel(@Body() dto: CreateChannelDto, @CurrentUser() user: User) {
    return this.chatService.createChannel(dto, user);
  }

  @Get('channels/:id/messages')
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiOperation({ summary: 'List channel messages by cursor' })
  async listMessages(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Query() query: ListMessagesDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.listMessages(channelId, user.id, query.before, query.limit);
  }

  @Post('channels/:id/messages')
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiOperation({ summary: 'Send message to channel' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    const message = await this.chatService.sendMessage(channelId, user.id, dto);
    this.chatGateway.emitNewMessage(channelId, message);
    return message;
  }

  @Post('channels/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024,
      },
    }),
  )
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiOperation({ summary: 'Upload attachment and send message' })
  async sendAttachment(
    @Param('id', ParseUUIDPipe) channelId: string,
    @UploadedFile() file: UploadedChatFile | undefined,
    @Body('content') content: string | undefined,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const message = await this.chatService.sendAttachment(channelId, user.id, file, content);
    this.chatGateway.emitNewMessage(channelId, message);
    return message;
  }

  @Get('attachments/:id/download')
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiOperation({ summary: 'Download attachment by id' })
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const attachment = await this.chatService.getAttachmentForDownload(attachmentId, user.id);
    const encodedName = encodeURIComponent(attachment.fileName || 'attachment');

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(attachment.size || 0));
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    createReadStream(attachment.filePath).pipe(res);
  }

  @Post('channels/:id/read')
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiOperation({ summary: 'Mark channel read' })
  async markRead(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Body() dto: MarkReadDto,
    @CurrentUser() user: User,
  ) {
    await this.chatService.markRead(channelId, dto.messageId, user.id);
    this.chatGateway.emitUnreadUpdated(channelId, user.id, dto.messageId);
  }

  @Post('channels/:id/pin')
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiOperation({ summary: 'Pin or unpin a channel in current user list' })
  async setPin(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Body() dto: SetPinDto,
    @CurrentUser() user: User,
  ) {
    await this.chatService.setPinned(channelId, user.id, dto.pinned);
  }
}
