import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({ description: 'User ID to assign the task to', required: false })
  @ApiPropertyOptional({ description: 'User ID to assign the task to' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Assignment comment or reason' })
  @IsOptional()
  @IsString()
  comment?: string;
}