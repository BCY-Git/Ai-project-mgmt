import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from '../modules/tasks/task.entity';
import { AiLog } from './ai-log.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'decomposing', 'reviewing', 'active', 'completed', 'archived'],
    default: 'draft'
  })
  status: string;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @OneToMany(() => AiLog, log => log.project)
  aiLogs: AiLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
