import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ChatChannelType } from '../entities/chat-channel.entity';

export class CreateChannelDto {
  @ApiProperty({ enum: ChatChannelType, example: ChatChannelType.GROUP })
  @IsEnum(ChatChannelType)
  type: ChatChannelType;

  @ApiPropertyOptional({ description: 'Channel name', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Project id for project channel' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Member user IDs, creator will always be included',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
