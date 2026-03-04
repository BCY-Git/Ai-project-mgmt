import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@/common/strategies/jwt-refresh.strategy';
import { User } from '@/entities/user.entity';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret') || 'access-secret',
        signOptions: {
          expiresIn: configService.get('jwt.accessExpires') || '15m',
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // TODO: Fix JwtRefreshStrategy
  exports: [AuthService],
})
export class AuthModule {}