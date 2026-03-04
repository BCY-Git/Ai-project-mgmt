import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Project } from '@/entities/project.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../entities/user-roles.enum';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(user: User, listDto: ListProjectsDto): Promise<{ projects: Project[]; total: number; page: number; limit: number }> {
    const { page = 0, limit = 20, status, search } = listDto;

    const options: FindManyOptions<Project> = {
      relations: ['owner'],
      skip: page * limit,
      take: limit,
      order: {
        createdAt: 'DESC'
      }
    };

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.name = Like(`%${search}%`);
    }

    options.where = whereClause;

    const [projects, total] = await this.projectRepository.findAndCount(options);

    return {
      projects,
      total,
      page,
      limit
    };
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner']
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const hasAccess = project.ownerId === user.id ||
                     user.role === UserRole.ADMIN ||
                     user.role === UserRole.MANAGER;

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async create(createDto: CreateProjectDto, user: User): Promise<Project> {
    const project = this.projectRepository.create({
      ...createDto,
      ownerId: user.id,
      owner: user
    });

    return this.projectRepository.save(project);
  }

  async update(id: string, updateDto: UpdateProjectDto, user: User): Promise<Project> {
    const project = await this.findOne(id, user);

    const canUpdate = project.ownerId === user.id ||
                     user.role === UserRole.ADMIN ||
                     user.role === UserRole.MANAGER;

    if (!canUpdate) {
      throw new ForbiddenException('Only project creator, admins, and managers can update projects');
    }

    this.projectRepository.merge(project, updateDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete projects');
    }

    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner']
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    await this.projectRepository.remove(project);
  }

  async findMyProjects(user: User, listDto: ListProjectsDto): Promise<{ projects: Project[]; total: number; page: number; limit: number }> {
    const { page = 0, limit = 20, status, search } = listDto;

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('project.ownerId = :userId', { userId: user.id })
      .skip(page * limit)
      .take(limit)
      .orderBy('project.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('project.name LIKE :search', { search: `%${search}%` });
    }

    const [projects, total] = await queryBuilder.getManyAndCount();

    return {
      projects,
      total,
      page,
      limit
    };
  }
}
