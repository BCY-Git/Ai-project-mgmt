import { IsString, IsOptional, IsEnum, IsInt, IsUUID, IsArray, Min, MaxLength, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../task.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTasksDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term for title/description' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  @ApiPropertyOptional({ description: 'Project ID filter' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Parent task ID filter' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ description: 'Assignee ID filter' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Created by user ID filter' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Array of tags to filter by' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Show tasks without dependencies only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  showWithoutDependencies?: boolean;
}