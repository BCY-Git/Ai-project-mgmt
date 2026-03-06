import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/entities/user.entity';
import { Project } from '@/entities/project.entity';
import { ChatChannelMember } from './chat-channel-member.entity';
import { ChatMessage } from './chat-message.entity';

export enum ChatChannelType {
  PROJECT = 'project_channel',
  DIRECT = 'direct',
  GROUP = 'group',
  ANNOUNCEMENT = 'announcement',
}

@Entity('chat_channels')
export class ChatChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ChatChannelType,
    default: ChatChannelType.GROUP,
  })
  type: ChatChannelType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @Column({ nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @Column()
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ default: false })
  isArchived: boolean;

  @OneToMany(() => ChatChannelMember, (member) => member.channel)
  members: ChatChannelMember[];

  @OneToMany(() => ChatMessage, (message) => message.channel)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
