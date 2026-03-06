import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '@/entities/user.entity';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';

export enum ChatChannelMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('chat_channel_members')
@Unique('UQ_chat_channel_member', ['channelId', 'userId'])
export class ChatChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: string;

  @ManyToOne(() => ChatChannel, (channel) => channel.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: ChatChannel;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ChatChannelMemberRole,
    default: ChatChannelMemberRole.MEMBER,
  })
  role: ChatChannelMemberRole;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  muteUntil: Date | null;

  @Column({ nullable: true })
  lastReadMessageId: string | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastReadMessageId' })
  lastReadMessage: ChatMessage | null;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
