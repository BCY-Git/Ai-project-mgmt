import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname, resolve } from 'path';
import { mkdir, stat, writeFile } from 'fs/promises';
import { User } from '@/entities/user.entity';
import { Project } from '@/entities/project.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatChannel, ChatChannelType } from './entities/chat-channel.entity';
import {
  ChatChannelMember,
  ChatChannelMemberRole,
} from './entities/chat-channel-member.entity';
import { ChatMessage, ChatMessageType } from './entities/chat-message.entity';
import { ChatAttachment } from './entities/chat-attachment.entity';

type UploadedChatFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type DownloadableAttachment = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  filePath: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatChannel)
    private readonly channelRepository: Repository<ChatChannel>,
    @InjectRepository(ChatChannelMember)
    private readonly channelMemberRepository: Repository<ChatChannelMember>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatAttachment)
    private readonly attachmentRepository: Repository<ChatAttachment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async listContacts(userId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        isActive: true,
        id: Not(userId),
      },
      select: ['id', 'name', 'email', 'role', 'skills', 'currentWorkload', 'isActive', 'createdAt', 'updatedAt'],
      order: {
        name: 'ASC',
      },
    });
  }

  async listChannels(
    userId: string,
  ): Promise<Array<ChatChannel & { lastMessage: ChatMessage | null; unreadCount: number; isPinned: boolean }>> {
    const memberships = await this.channelMemberRepository.find({
      where: { userId },
      relations: ['channel', 'channel.project', 'channel.createdBy', 'channel.members', 'channel.members.user'],
      order: { updatedAt: 'DESC' },
    });

    const membershipMap = new Map(memberships.map((membership) => [membership.channelId, membership]));

    const channels = memberships
      .map((membership) => membership.channel)
      .filter((channel) => !channel.isArchived);

    const uniqueChannels = Array.from(new Map(channels.map((channel) => [channel.id, channel])).values());

    const channelIds = uniqueChannels.map((channel) => channel.id);
    const lastMessages = channelIds.length
      ? await this.messageRepository
          .createQueryBuilder('message')
          .leftJoinAndSelect('message.sender', 'sender')
          .leftJoinAndSelect('message.attachments', 'attachments')
          .where('message.channelId IN (:...channelIds)', { channelIds })
          .andWhere('message.recalledAt IS NULL')
          .orderBy('message.createdAt', 'DESC')
          .getMany()
      : [];

    const lastMessageMap = new Map<string, ChatMessage>();
    lastMessages.forEach((message) => {
      if (!lastMessageMap.has(message.channelId)) {
        lastMessageMap.set(message.channelId, message);
      }
    });

    const lastReadMessageIds = memberships
      .map((membership) => membership.lastReadMessageId)
      .filter((value): value is string => Boolean(value));

    const lastReadMessages = lastReadMessageIds.length
      ? await this.messageRepository.find({
          where: { id: In(lastReadMessageIds) },
          select: ['id', 'createdAt'],
        })
      : [];
    const lastReadTimeMap = new Map(lastReadMessages.map((message) => [message.id, message.createdAt]));

    const unreadEntries = await Promise.all(
      memberships.map(async (membership) => {
        const queryBuilder = this.messageRepository
          .createQueryBuilder('message')
          .where('message.channelId = :channelId', { channelId: membership.channelId })
          .andWhere('message.recalledAt IS NULL')
          .andWhere('message.senderId != :userId', { userId });

        const lastReadAt = membership.lastReadMessageId
          ? lastReadTimeMap.get(membership.lastReadMessageId)
          : null;
        if (lastReadAt) {
          queryBuilder.andWhere('message.createdAt > :lastReadAt', { lastReadAt });
        }

        const count = await queryBuilder.getCount();
        return [membership.channelId, count] as const;
      }),
    );
    const unreadMap = new Map(unreadEntries);

    const channelRows = uniqueChannels.map((channel) => ({
      ...channel,
      lastMessage: lastMessageMap.get(channel.id) || null,
      unreadCount: unreadMap.get(channel.id) || 0,
      isPinned: membershipMap.get(channel.id)?.isPinned || false,
    }));

    return channelRows.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt).getTime();
      return bTime - aTime;
    });
  }

  async createChannel(dto: CreateChannelDto, user: User): Promise<ChatChannel> {
    if (dto.type === ChatChannelType.PROJECT && !dto.projectId) {
      throw new BadRequestException('projectId is required for project channel');
    }

    const normalizedMemberIds = Array.from(new Set([...(dto.memberIds || []), user.id]));
    const users = normalizedMemberIds.length
      ? await this.userRepository.find({
          where: { id: In(normalizedMemberIds), isActive: true },
        })
      : [];

    if (users.length !== normalizedMemberIds.length) {
      throw new BadRequestException('One or more members are invalid');
    }

    if (dto.type === ChatChannelType.DIRECT) {
      if (normalizedMemberIds.length !== 2) {
        throw new BadRequestException('Direct chat must contain exactly two members');
      }

      const existingChannel = await this.channelRepository
        .createQueryBuilder('channel')
        .innerJoin('channel.members', 'member')
        .where('channel.type = :type', { type: ChatChannelType.DIRECT })
        .andWhere('channel.isArchived = false')
        .groupBy('channel.id')
        .having('COUNT(member.id) = 2')
        .andHaving(
          'COUNT(CASE WHEN member.userId IN (:...memberIds) THEN 1 END) = 2',
          { memberIds: normalizedMemberIds },
        )
        .getOne();

      if (existingChannel) {
        return this.channelRepository.findOneOrFail({
          where: { id: existingChannel.id },
          relations: ['createdBy', 'project', 'members', 'members.user'],
        });
      }
    }

    if (dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    const channelId = await this.dataSource.transaction(async (manager) => {
      const channel = manager.create(ChatChannel, {
        type: dto.type,
        name: dto.name?.trim() || null,
        projectId: dto.projectId || null,
        createdById: user.id,
      });

      const savedChannel = await manager.save(channel);

      const members = users.map((member) =>
        manager.create(ChatChannelMember, {
          channelId: savedChannel.id,
          userId: member.id,
          role: member.id === user.id ? ChatChannelMemberRole.OWNER : ChatChannelMemberRole.MEMBER,
        }),
      );

      await manager.save(members);
      return savedChannel.id;
    });

    return this.channelRepository.findOneOrFail({
      where: { id: channelId },
      relations: ['createdBy', 'project', 'members', 'members.user'],
    });
  }

  async listMessages(channelId: string, userId: string, before?: string, limit = 30): Promise<ChatMessage[]> {
    await this.assertChannelAccess(channelId, userId);

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyToMessage', 'replyToMessage')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.channelId = :channelId', { channelId })
      .andWhere('message.recalledAt IS NULL')
      .orderBy('message.createdAt', 'DESC')
      .take(safeLimit);

    if (before) {
      const beforeMessage = await this.messageRepository.findOne({
        where: { id: before, channelId },
      });
      if (beforeMessage) {
        queryBuilder.andWhere('message.createdAt < :beforeTime', { beforeTime: beforeMessage.createdAt });
      }
    }

    const messages = await queryBuilder.getMany();
    return messages.reverse();
  }

  async sendMessage(channelId: string, userId: string, dto: SendMessageDto): Promise<ChatMessage> {
    await this.assertChannelAccess(channelId, userId);

    if (
      (dto.type === ChatMessageType.TEXT || dto.type === ChatMessageType.EMOJI) &&
      !dto.content?.trim()
    ) {
      throw new BadRequestException('Message content is required');
    }

    if (dto.replyToMessageId) {
      const replyMessage = await this.messageRepository.findOne({
        where: { id: dto.replyToMessageId, channelId },
      });

      if (!replyMessage) {
        throw new NotFoundException('Reply message not found');
      }
    }

    const created = this.messageRepository.create({
      channelId,
      senderId: userId,
      type: dto.type,
      content: dto.content?.trim() || null,
      replyToMessageId: dto.replyToMessageId || null,
    });

    const saved = await this.messageRepository.save(created);
    return this.messageRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['sender', 'replyToMessage', 'attachments'],
    });
  }

  async sendAttachment(
    channelId: string,
    userId: string,
    file: UploadedChatFile,
    content?: string,
  ): Promise<ChatMessage> {
    await this.assertChannelAccess(channelId, userId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const extension = extname(file.originalname || '').toLowerCase();
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadRoot = this.getUploadRoot();
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(resolve(uploadRoot, storedName), file.buffer);

    const messageType = this.resolveMessageType(file.mimetype || '', extension);

    const messageId = await this.dataSource.transaction(async (manager) => {
      const message = manager.create(ChatMessage, {
        channelId,
        senderId: userId,
        type: messageType,
        content: content?.trim() || file.originalname,
      });
      const savedMessage = await manager.save(message);

      const attachment = manager.create(ChatAttachment, {
        messageId: savedMessage.id,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: String(file.size || 0),
        storageKey: storedName,
        thumbnailKey: null,
        duration: null,
        checksum: null,
      });
      await manager.save(attachment);

      return savedMessage.id;
    });

    return this.messageRepository.findOneOrFail({
      where: { id: messageId },
      relations: ['sender', 'replyToMessage', 'attachments'],
    });
  }

  async markRead(channelId: string, messageId: string, userId: string): Promise<void> {
    await this.assertChannelAccess(channelId, userId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, channelId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const membership = await this.channelMemberRepository.findOne({
      where: { channelId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this channel');
    }

    membership.lastReadMessageId = messageId;
    await this.channelMemberRepository.save(membership);
  }

  async setPinned(channelId: string, userId: string, pinned: boolean): Promise<void> {
    const membership = await this.channelMemberRepository.findOne({
      where: { channelId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this channel');
    }

    membership.isPinned = pinned;
    await this.channelMemberRepository.save(membership);
  }

  async getAttachmentForDownload(attachmentId: string, userId: string): Promise<DownloadableAttachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['message'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.assertChannelAccess(attachment.message.channelId, userId);

    const filePath = resolve(this.getUploadRoot(), attachment.storageKey);
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException('Attachment file not found');
    }

    return {
      attachmentId: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: Number(attachment.size || 0),
      filePath,
    };
  }

  async assertChannelAccess(channelId: string, userId: string): Promise<void> {
    const membership = await this.channelMemberRepository.findOne({
      where: { channelId, userId },
    });

    if (membership) {
      return;
    }

    const channel = await this.channelRepository.findOne({
      where: { id: channelId, isArchived: false },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    throw new ForbiddenException('No access to this channel');
  }

  private getUploadRoot(): string {
    return resolve(process.cwd(), 'uploads', 'chat');
  }

  private resolveMessageType(mimeType: string, extension: string): ChatMessageType {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith('image/')) return ChatMessageType.IMAGE;
    if (mime.startsWith('video/')) return ChatMessageType.VIDEO;
    if (mime.startsWith('audio/')) return ChatMessageType.AUDIO;
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension)) return ChatMessageType.ZIP;
    return ChatMessageType.FILE;
  }
}
