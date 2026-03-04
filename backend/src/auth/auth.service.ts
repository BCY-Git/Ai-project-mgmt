import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../modules/users/users.service';
import type { User } from '@/entities/user.entity';
import type { LoginDto, RegisterDto } from '@/types/auth.types';
import * as bcrypt from 'bcrypt';

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 移除密码字段
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const tokens = await this.generateTokens(user);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // 创建新用户
    const user = await this.userService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: registerDto.role || 'member',
    });

    const tokens = await this.generateTokens(user);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret') || 'refresh-secret',
      });

      const user = await this.userService.findById(payload.sub);

      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('无效的刷新Token');
    }
  }

  private async generateTokens(user: Omit<User, 'password'>) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.accessSecret') || 'access-secret',
      expiresIn: this.configService.get('jwt.accessExpires') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret') || 'refresh-secret',
      expiresIn: this.configService.get('jwt.refreshExpires') || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}