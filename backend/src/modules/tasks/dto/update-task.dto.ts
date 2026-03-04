import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsUUID, Min, Max, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '../task.entity';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}