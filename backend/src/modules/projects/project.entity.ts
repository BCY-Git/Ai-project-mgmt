import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '@/entities/user.entity';
import { UserRole } from '@/entities/user-roles.enum';
import { Task } from '../tasks/task.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  DECOMPOSING = 'decomposing',
  REVIEWING = 'reviewing',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT
  })
  status: ProjectStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column()
  createdById: number;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @ManyToMany(() => User, { eager: true })
  @JoinTable({
    name: 'project_members',
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}