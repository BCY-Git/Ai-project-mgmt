import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_attachments')
export class ChatAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @ManyToOne(() => ChatMessage, (message) => message.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: string;

  @Column({ type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailKey: string | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
