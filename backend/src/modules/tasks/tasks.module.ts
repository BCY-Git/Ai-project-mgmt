import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { User } from '@/entities/user.entity';
import { Project } from '@/entities/project.entity';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuthModule } from '@/auth/auth.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Project]),
    UsersModule,
    ProjectsModule,
    AuthModule,
    AiModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
