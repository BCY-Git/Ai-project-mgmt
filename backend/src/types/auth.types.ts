import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码长度至少6位' })
  password: string;
}

export class RegisterDto {
  @IsString({ message: '姓名必须是字符串' })
  @MinLength(2, { message: '姓名长度至少2位' })
  name: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码长度至少6位' })
  password: string;

  @IsIn(['admin', 'manager', 'member'], { message: '角色必须是 admin、manager 或 member' })
  @IsOptional()
  role?: 'admin' | 'manager' | 'member';
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}