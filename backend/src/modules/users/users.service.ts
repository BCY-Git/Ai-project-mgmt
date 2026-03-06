import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Task } from '@/modules/tasks/task.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    // 检查邮箱是否已存在
    if (userData.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new ConflictException('邮箱已存在');
      }
    }

    // 加密密码
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'password', 'role', 'skills', 'currentWorkload', 'isActive', 'createdAt', 'updatedAt'],
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'email', 'name', 'role', 'skills', 'currentWorkload', 'createdAt', 'updatedAt'],
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.findByIds(ids);
  }

  async updateSkills(userId: string, skills: string[]) {
    await this.findById(userId);
    await this.userRepository.update(userId, {
      skills,
    });
    return this.findById(userId);
  }

  async findUserTasks(userId: string): Promise<Task[]> {
    await this.findById(userId);
    return this.taskRepository.find({
      where: { assigneeId: userId },
      relations: ['project', 'assignee', 'createdBy', 'parentTask', 'subtasks', 'dependencies', 'dependentOn'],
      order: { updatedAt: 'DESC' },
    });
  }

  async updateUserWorkload(userId: string, hoursChange: number) {
    const user = await this.findById(userId);
    await this.userRepository.update(userId, {
      currentWorkload: Math.max(0, user.currentWorkload + hoursChange),
    });
  }
}
