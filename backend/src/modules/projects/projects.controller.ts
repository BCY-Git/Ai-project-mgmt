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
  Request,
  ParseUUIDPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Project } from '@/entities/project.entity';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user-roles.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination' })
  async findAll(@Request() req, @Query() listDto: ListProjectsDto) {
    return this.projectsService.findAll(req.user, listDto);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  @ApiOperation({ summary: 'Create a new project' })
  async create(@Request() req, @Body() createDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(createDto, req.user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user projects' })
  async findMyProjects(@Request() req, @Query() listDto: ListProjectsDto) {
    return this.projectsService.findMyProjects(req.user, listDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update project' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectDto
  ): Promise<Project> {
    return this.projectsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete project' })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectsService.remove(id, req.user);
  }
}
