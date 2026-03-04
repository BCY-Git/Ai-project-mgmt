import { IsArray, IsUUID, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReorderTaskDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'New sort order', minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional({ description: 'New parent task ID for hierarchy changes' })
  @IsUUID()
  @IsOptional()
  parentTaskId?: string;
}

export class ReorderTasksDto {
  @ApiProperty({ description: 'Array of tasks with new order', type: [ReorderTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTaskDto)
  tasks: ReorderTaskDto[];
}