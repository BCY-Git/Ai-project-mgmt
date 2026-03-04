import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { databaseConfig, redisConfig } from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Task } from './modules/tasks/task.entity';
import { AiLog } from './entities/ai-log.entity';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig, redisConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        console.log('Database config:', {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD ? '(set)' : '(not set)',
          database: process.env.DB_NAME,
        });

        return {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'xiaoer',
          database: process.env.DB_NAME || 'ai_project_mgmt',
          entities: [User, Project, Task, AiLog],
          synchronize: process.env.NODE_ENV === 'development',
          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
