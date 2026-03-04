import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

const PROJECT_STATUS = ['draft', 'decomposing', 'reviewing', 'active', 'completed', 'archived'] as const;
type ProjectStatus = typeof PROJECT_STATUS[number];

export class ListProjectsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PROJECT_STATUS)
  status?: ProjectStatus;

  @IsOptional()
  search?: string;
}
