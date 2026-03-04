import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from '@/entities/project.entity';
import { User } from '@/entities/user.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'int', nullable: true })
  estimatedHours: number | null;

  @Column({ type: 'int', nullable: true })
  actualHours: number | null;

  @Column({ nullable: false })
  projectId: string;

  @ManyToOne(() => Project, project => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ nullable: true })
  parentTaskId: string | null;

  @ManyToOne(() => Task, task => task.subtasks, { nullable: true })
  @JoinColumn({ name: 'parentTaskId' })
  parentTask: Task;

  @OneToMany(() => Task, task => task.parentTask)
  subtasks: Task[];

  @Column({ nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Column({ nullable: false })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToMany(() => Task, task => task.dependentOn)
  @JoinTable({
    name: 'task_dependencies',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'dependency_id', referencedColumnName: 'id' },
  })
  dependencies: Task[];

  @ManyToMany(() => Task, task => task.dependencies, { cascade: true })
  dependentOn: Task[];

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
