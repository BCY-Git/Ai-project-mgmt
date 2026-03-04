import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { DecomposeTaskDto } from './dto/decompose-task.dto';
import { User } from '@/entities/user.entity';
import type { UploadedInputFile } from '../ai/ai-input-parser.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(@Query() query: ListTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's assigned tasks" })
  @ApiResponse({ status: 200, description: 'User tasks retrieved successfully' })
  async findMyTasks(@CurrentUser() user: User, @Query() query: ListTasksDto) {
    return this.tasksService.findMyTasks(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: User): Promise<Task> {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Post('ai/decompose')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'AI decompose project into task suggestions' })
  @ApiResponse({ status: 200, description: 'AI decomposition completed successfully' })
  async decomposeWithAi(
    @Body() decomposeTaskDto: DecomposeTaskDto,
    @CurrentUser() user: User,
    @UploadedFile() file?: UploadedInputFile,
  ) {
    return this.tasksService.decomposeProjectPlan(decomposeTaskDto, user, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    const task = await this.tasksService.findOne(id);

    // Check if user has access to this task
    const hasAccess = await this.tasksService.hasAccessToTask(id, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return task;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    // Check if user has permission to update this task
    const hasAccess = await this.tasksService.canUpdateTask(id, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    // Check if user has permission to delete this task
    const hasAccess = await this.tasksService.canDeleteTask(id, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    // Check if task has subtasks
    const hasSubtasks = await this.tasksService.hasSubtasks(id);
    if (hasSubtasks) {
      throw new BadRequestException('Cannot delete a task that has subtasks');
    }

    await this.tasksService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    // Check if user has permission to update this task
    const hasAccess = await this.tasksService.canUpdateTask(id, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    // Check if dependencies are completed when moving to done
    if (status === 'done') {
      const dependenciesCompleted = await this.tasksService.areDependenciesCompleted(id);
      if (!dependenciesCompleted) {
        throw new BadRequestException('Cannot complete task with pending dependencies');
      }
    }

    return this.tasksService.updateStatus(id, status as TaskStatus);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  async assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    // Check if user has permission to assign this task
    const hasAccess = await this.tasksService.canAssignTask(id, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to assign this task');
    }

    return this.tasksService.assignTask(id, assignTaskDto.assigneeId, user.id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks (for drag-drop)' })
  @ApiResponse({ status: 200, description: 'Tasks reordered successfully' })
  async reorderTasks(
    @Body() reorderTasksDto: ReorderTasksDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    // Validate all tasks belong to same project and user has access
    await this.tasksService.validateReorderAccess(reorderTasksDto.tasks, user.id);

    await this.tasksService.reorderTasks(reorderTasksDto.tasks);
  }
}
