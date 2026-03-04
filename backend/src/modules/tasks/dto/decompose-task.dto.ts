import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateIf } from 'class-validator';

const INPUT_MODES = ['prompt', 'paste', 'file'] as const;
export type DecomposeInputMode = typeof INPUT_MODES[number];

export class DecomposeTaskDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @ValidateIf((o: DecomposeTaskDto) => o.inputMode !== 'file')
  @IsString()
  projectDescription: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsIn(INPUT_MODES)
  inputMode?: DecomposeInputMode;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  maxTasks?: number;
}
