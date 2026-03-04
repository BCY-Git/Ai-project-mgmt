import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsUUID, Min, Max } from 'class-validator';
import { TaskStatus, TaskPriority } from '../task.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Estimated hours for the task' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Actual hours spent on the task' })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualHours?: number;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Parent task ID' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Array of dependency task IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependencies?: string[];

  @ApiPropertyOptional({ description: 'Task tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort order for drag-drop', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}