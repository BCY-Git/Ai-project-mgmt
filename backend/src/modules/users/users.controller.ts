import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './users.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import type { User } from '@/entities/user.entity';

export interface UpdateSkillsDto {
  skills: string[];
}

export interface UpdateWorkloadDto {
  workload: number;
}

@ApiTags('用户管理')
@Controller('users')
@UseGuards(AuthenticatedGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  async findAll(@CurrentUser() currentUser: User) {
    // 只有admin和manager可以查看所有用户
    if (!['admin', 'manager'].includes(currentUser.role)) {
      throw new ForbiddenException('没有权限访问');
    }

    return this.userService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  getCurrentUser(@CurrentUser() user: User) {
    const { password, ...result } = user;
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定用户信息' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.userService.findById(id);
    const { password, ...result } = user;
    return result;
  }

  @Put(':id/skills')
  @ApiOperation({ summary: '更新用户技能' })
  async updateSkills(
    @Param('id') id: string,
    @Body() dto: UpdateSkillsDto,
    @CurrentUser() currentUser: User,
  ) {
    // 只能更新自己的技能，或者管理员可以更新任何人
    if (id !== currentUser.id && currentUser.role !== 'admin') {
      throw new ForbiddenException('没有权限操作');
    }

    return this.userService.updateSkillsAndWorkload(id, dto.skills, 0);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: '获取用户所有任务' })
  async getUserTasks(@Param('id') id: string) {
    // TODO: 实现获取用户任务
    return [];
  }
}