import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, MaxLength, MinLength } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

const PROJECT_STATUS = ['draft', 'decomposing', 'reviewing', 'active', 'completed', 'archived'] as const;
type ProjectStatus = typeof PROJECT_STATUS[number];

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PROJECT_STATUS)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];
}
