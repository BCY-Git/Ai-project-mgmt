import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ChatMessageType } from '../entities/chat-message.entity';

export class SendMessageDto {
  @ApiProperty({ enum: ChatMessageType, example: ChatMessageType.TEXT })
  @IsEnum(ChatMessageType)
  type: ChatMessageType;

  @ApiPropertyOptional({ description: 'Message content for text/emoji/system' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  content?: string;

  @ApiPropertyOptional({ description: 'Reply message id' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}
