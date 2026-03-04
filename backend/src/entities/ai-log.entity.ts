import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('ai_logs')
export class AiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  project: Project;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'jsonb', nullable: true })
  response: object;

  @Column({ default: false })
  isAdopted: boolean;

  @Column({ nullable: true })
  model: string;

  @Column({ type: 'int', default: 0 })
  tokensUsed: number;

  @CreateDateColumn()
  createdAt: Date;
}