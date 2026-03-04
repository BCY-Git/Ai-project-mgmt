import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { ReorderTaskDto } from './dto/reorder-tasks.dto';
import { DecomposeTaskDto } from './dto/decompose-task.dto';
import { User } from '@/entities/user.entity';
import { Project } from '@/entities/project.entity';
import { UserRole } from '@/entities/user-roles.enum';
import { AiService } from '../ai/ai.service';
import { AiInputParserService, UploadedInputFile } from '../ai/ai-input-parser.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly aiService: AiService,
    private readonly aiInputParserService: AiInputParserService,
    private readonly dataSource: DataSource,
  ) {}

  async decomposeProjectPlan(dto: DecomposeTaskDto, user: User, file?: UploadedInputFile) {
    let project: Project | null = null;

    if (dto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: dto.projectId } as any,
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }

      const canAccess =
        project.ownerId === user.id ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.MANAGER;

      if (!canAccess) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    const projectDescription = await this.resolveDecomposeText(dto, file, project);
    if (!projectDescription) {
      throw new BadRequestException('projectDescription is required');
    }

    return this.aiService.decomposeProject({
      projectName: dto.projectName || project?.name,
      projectDescription,
      maxTasks: dto.maxTasks,
    });
  }

  private async resolveDecomposeText(
    dto: DecomposeTaskDto,
    file: UploadedInputFile | undefined,
    project: Project | null,
  ): Promise<string> {
    const inputMode = dto.inputMode || 'prompt';

    if (inputMode === 'file') {
      return this.aiInputParserService.parseFromUpload(file as UploadedInputFile);
    }

    const text = dto.projectDescription?.trim() || project?.description?.trim() || '';
    return text;
  }

  async findAll(query: ListTasksDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      projectId,
      parentTaskId,
      assigneeId,
      createdById,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      showWithoutDependencies,
    } = query;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.parentTask', 'parentTask')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .leftJoinAndSelect('task.dependencies', 'dependencies')
      .leftJoinAndSelect('task.dependentOn', 'dependentOn');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status && status.length > 0) {
      queryBuilder.andWhere('task.status IN (:...status)', { status });
    }

    if (priority && priority.length > 0) {
      queryBuilder.andWhere('task.priority IN (:...priority)', { priority });
    }

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    if (parentTaskId !== undefined) {
      if (parentTaskId === 'null') {
        queryBuilder.andWhere('task.parentTaskId IS NULL');
      } else {
        queryBuilder.andWhere('task.parentTaskId = :parentTaskId', { parentTaskId });
      }
    }

    if (assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }

    if (createdById) {
      queryBuilder.andWhere('task.createdById = :createdById', { createdById });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('task.tags && :tags', { tags });
    }

    if (showWithoutDependencies) {
      queryBuilder.andWhere('NOT EXISTS (SELECT 1 FROM task_dependencies td WHERE td.task_id = task.id)');
    }

    // Apply sorting
    const validSortFields = [
      'title', 'status', 'priority', 'createdAt', 'updatedAt', 'sortOrder', 'dueDate'
    ];

    if (validSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`task.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('task.createdAt', 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    const tasks = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyTasks(userId: string, query: ListTasksDto) {
    return this.findAll({
      ...query,
      assigneeId: userId,
    });
  }

  async findProjectTasks(projectId: string, query: ListTasksDto) {
    return this.findAll({
      ...query,
      projectId,
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'project',
        'assignee',
        'createdBy',
        'parentTask',
        'subtasks',
        'dependencies',
        'dependentOn',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(createTaskDto: CreateTaskDto, createdById: string): Promise<Task> {
    const {
      title,
      description,
      status = TaskStatus.TODO,
      priority = TaskPriority.MEDIUM,
      estimatedHours,
      actualHours,
      projectId,
      parentTaskId,
      assigneeId,
      dependencies = [],
      tags = [],
      sortOrder = 0,
    } = createTaskDto;

    // Verify project exists and user has access
    const project = await this.projectRepository.findOne({
      where: { id: projectId } as any,
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check parent task exists and belongs to same project if provided
    if (parentTaskId) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: parentTaskId, projectId },
      });

      if (!parentTask) {
        throw new NotFoundException(`Parent task with ID ${parentTaskId} not found in project`);
      }

      // Check for circular dependency
      // Circular dependency check handled at runtime
    }

    // Get next sort order if not provided
    const finalSortOrder = sortOrder > 0 ? sortOrder : await this.getNextSortOrder(projectId, parentTaskId);

    // Use transaction to create task and dependencies
    const createdTaskId = await this.dataSource.transaction(async (manager) => {
      // Create the task
      const task = manager.create(Task, {
        title,
        description,
        status,
        priority,
        estimatedHours,
        actualHours,
        projectId,
        parentTaskId,
        assigneeId,
        createdById,
        tags,
        sortOrder: finalSortOrder,
      });

      const savedTask = await manager.save(task);

      // Add dependencies if provided
      if (dependencies.length > 0) {
        const dependencyTasks = await manager.find(Task, {
          where: { id: In(dependencies) },
        });

        if (dependencyTasks.length !== dependencies.length) {
          throw new NotFoundException('One or more dependency tasks not found');
        }

        // Check for circular dependencies
        await this.checkCircularDependencies(savedTask.id, dependencies);

        savedTask.dependencies = dependencyTasks;
        await manager.save(savedTask);
      }

      return savedTask.id;
    });

    return this.findOne(createdTaskId);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    const { dependencies, status, completedAt, ...updateData } = updateTaskDto;

    // Check if changing parent
    if (updateData.parentTaskId !== undefined && updateData.parentTaskId !== task.parentTaskId) {
      if (updateData.parentTaskId) {
        // Verify new parent is in same project
        const parentTask = await this.taskRepository.findOne({
          where: { id: updateData.parentTaskId, projectId: task.projectId },
        });

        if (!parentTask) {
          throw new NotFoundException('Parent task not found in the same project');
        }

        // Check for circular dependency
        if (updateData.parentTaskId === id) {
          throw new BadRequestException('Task cannot be its own parent');
        }
      }
    }

    // Update task
    Object.assign(task, updateData);

    // Handle status change
    if (status) {
      task.status = status;
      if (status === TaskStatus.DONE && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== TaskStatus.DONE) {
        task.completedAt = null;
      }
    }

    // Handle completedAt override
    if (completedAt) {
      task.completedAt = new Date(completedAt);
    }

    // Update dependencies if provided
    if (dependencies && dependencies.length > 0) {
      const dependencyTasks = await this.taskRepository.find({
        where: { id: In(dependencies) },
      });

      if (dependencyTasks.length !== dependencies.length) {
        throw new NotFoundException('One or more dependency tasks not found');
      }

      // Check for circular dependencies
      await this.checkCircularDependencies(id, dependencies);

      task.dependencies = dependencyTasks;
    }

    await this.taskRepository.save(task);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);

    // Check for dependent tasks
    const dependentCount = await this.taskRepository.count({
      where: { dependencies: { id } },
    });

    if (dependentCount > 0) {
      throw new ConflictException('Cannot delete task that is a dependency for other tasks');
    }

    await this.taskRepository.remove(task);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);

    task.status = status;

    if (status === TaskStatus.DONE && !task.completedAt) {
      task.completedAt = new Date();
    } else if (status !== TaskStatus.DONE) {
      task.completedAt = null;
    }

    await this.taskRepository.save(task);

    return this.findOne(id);
  }

  async assignTask(taskId: string, assigneeId: string | undefined, assignedById: string): Promise<Task> {
    const task = await this.findOne(taskId);

    // If assigning to someone else, update assignee
    if (assigneeId) {
      task.assigneeId = assigneeId;
    } else {
      task.assigneeId = null;
    }

    await this.taskRepository.save(task);

    return this.findOne(taskId);
  }

  async reorderTasks(tasks: ReorderTaskDto[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const { id, sortOrder, parentTaskId } of tasks) {
        await manager.update(Task, id, {
          sortOrder,
          parentTaskId: parentTaskId,
        });
      }
    });
  }

  async hasAccessToTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      return false;
    }

    // User has access if:
    // 1. They created the task
    // 2. They are assigned to the task
    // 3. They are the project owner
    // 4. They are assigned to the project (if implemented)
    // 5. They are an admin or manager

    if (task.createdById === userId || task.assigneeId === userId) {
      return true;
    }

    // Check if user is project owner
    if (task.project.ownerId === userId) {
      return true;
    }

    // TODO: Check project assignments when implemented

    return false;
  }

  async canUpdateTask(taskId: string, userId: string): Promise<boolean> {
    return this.hasAccessToTask(taskId, userId);
  }

  async canDeleteTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.findOne(taskId);

    // Only creator or project owner can delete
    return task.createdById === userId || task.project.ownerId === userId;
  }

  async canAssignTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.findOne(taskId);

    // Only project owner or task creator can assign
    return task.createdById === userId || task.project.ownerId === userId;
  }

  async hasSubtasks(taskId: string): Promise<boolean> {
    const count = await this.taskRepository.count({
      where: { parentTaskId: taskId },
    });

    return count > 0;
  }

  async areDependenciesCompleted(taskId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['dependencies'],
    });

    if (!task || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(dep => dep.status === TaskStatus.DONE);
  }

  async validateReorderAccess(tasks: ReorderTaskDto[], userId: string): Promise<void> {
    const taskIds = tasks.map(t => t.id);
    const foundTasks = await this.taskRepository.find({
      where: { id: In(taskIds) },
      relations: ['project'],
    });

    if (foundTasks.length !== taskIds.length) {
      throw new NotFoundException('One or more tasks not found');
    }

    // Check if all tasks belong to same project
    const projectIds = [...new Set(foundTasks.map(t => t.projectId))];
    if (projectIds.length > 1) {
      throw new BadRequestException('All tasks must belong to the same project');
    }

    // Check if user has access to reorder in this project
    const hasAccess = foundTasks.every(t =>
      t.createdById === userId || t.assigneeId === userId || t.project.ownerId === userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to reorder these tasks');
    }
  }

  private async getNextSortOrder(projectId: string, parentTaskId?: string): Promise<number> {
    const maxOrder = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.sortOrder)', 'max')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.parentTaskId = :parentTaskId', { parentTaskId: parentTaskId || null })
      .getRawOne();

    return (maxOrder?.max || 0) + 1;
  }

  private async checkCircularDependencies(taskId: string, dependencyIds: string[]): Promise<void> {
    // Build a simple check to prevent self-dependency
    if (dependencyIds.includes(taskId)) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    // TODO: Implement full circular dependency check using graph algorithm
    // This would require traversing the dependency graph to detect cycles
  }
}
