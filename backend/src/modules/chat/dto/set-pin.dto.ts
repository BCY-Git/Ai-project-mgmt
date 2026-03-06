import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetPinDto {
  @ApiProperty({ description: 'Pin state of channel in current user list' })
  @IsBoolean()
  pinned: boolean;
}
