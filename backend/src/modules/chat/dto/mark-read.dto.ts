import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ description: 'Latest read message id' })
  @IsUUID()
  messageId: string;
}
