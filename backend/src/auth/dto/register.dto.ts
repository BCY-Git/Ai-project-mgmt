import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
  IsOptional
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsString({ message: '姓名必须是字符串' })
  @MinLength(2, { message: '姓名长度至少2位' })
  @ApiProperty({ description: '用户姓名', example: '张三' })
  name: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @ApiProperty({ description: '邮箱地址', example: 'zhangsan@example.com' })
  email: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码长度至少6位' })
  @ApiProperty({ description: '密码', example: '123456' })
  password: string;

  @IsIn(['admin', 'manager', 'member'], { message: '角色必须是 admin、manager 或 member' })
  @IsOptional()
  @ApiProperty({
    description: '用户角色',
    enum: ['admin', 'manager', 'member'],
    example: 'member',
    required: false
  })
  role?: 'admin' | 'manager' | 'member';
}