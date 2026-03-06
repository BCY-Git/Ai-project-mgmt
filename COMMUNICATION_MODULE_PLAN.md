# 通信模块实施方案（侧边栏新增“通信”）

## 1. 目标与范围

在现有项目管理系统中新增一个“通信模块”，作为侧边栏一级导航，提供项目内与跨项目协作沟通能力。  
沟通方式尽量丰富，覆盖：

- 文字消息（支持 @ 提及、代码块、引用、链接预览）
- 表情（系统 emoji + 自定义表情包）
- 文件上传（文档、图片、音频、视频、压缩包）
- 视频沟通（短视频发送、在线视频通话预留）
- 压缩包上传与下载（zip/rar/7z）
- 消息回复、撤回、编辑、转发、收藏、已读状态

---

## 2. 侧边栏与信息架构

## 2.1 侧边栏新增入口

- 一级菜单：`通信`
- 进入默认页：`/chat`

## 2.2 模块内导航（左侧二级）

- 最近会话
- 项目群聊（按项目分组）
- 私聊
- 公告频道（管理层可发）
- 文件中心（通信附件聚合）

## 2.3 会话类型

- `project_channel`：项目群（自动包含项目成员）
- `direct`：1v1 私聊
- `group`：临时多人群聊
- `announcement`：公告频道（只允许指定角色发言）

---

## 3. 功能清单（按优先级）

## 3.1 MVP（第一阶段，2~3 周）

- 文字消息实时收发（WebSocket）
- 表情选择器（Unicode emoji）
- 附件上传（图片/文档/压缩包，最大 200MB）
- 视频文件上传与预览（mp4/webm，最大 500MB）
- 会话列表、未读数、已读回执（会话级）
- 消息回复、撤回（2 分钟内）、删除（仅自己）
- 项目群自动建群（随项目创建）

## 3.2 增强（第二阶段，2~4 周）

- 自定义表情包（团队级）
- 消息编辑历史
- 富文本增强（Markdown、代码高亮）
- 拖拽上传、粘贴上传、分片上传（大文件）
- 消息搜索（按关键词、发送人、时间、文件类型）
- 文件中心（按会话/项目过滤）

## 3.3 高级（第三阶段）

- 语音消息
- 实时音视频通话（WebRTC）
- 屏幕共享
- 消息翻译与敏感内容审核
- AI 总结（会话摘要、待办提取）

---

## 4. 技术架构（结合当前项目栈）

当前已有：`NestJS + TypeORM + PostgreSQL + Redis + Bull + React`。  
建议如下：

- 实时层：`@nestjs/websockets + socket.io`（前端已有 `socket.io-client` 依赖）
- 存储层：
  - 元数据：PostgreSQL
  - 文件：MinIO/S3（对象存储）
- 异步任务：Bull（缩略图、视频转码、病毒扫描、消息推送）
- 缓存与在线状态：Redis（用户在线状态、会话未读计数）

---

## 5. 数据模型设计（核心表）

- `chat_channels`
  - `id`, `type`, `name`, `projectId`, `createdById`, `isArchived`, `createdAt`
- `chat_channel_members`
  - `id`, `channelId`, `userId`, `role(owner/admin/member)`, `muteUntil`, `lastReadMessageId`, `joinedAt`
- `chat_messages`
  - `id`, `channelId`, `senderId`, `type(text/file/image/video/system)`, `content`, `replyToMessageId`, `editedAt`, `recalledAt`, `createdAt`
- `chat_message_reactions`
  - `id`, `messageId`, `userId`, `emoji`, `createdAt`
- `chat_attachments`
  - `id`, `messageId`, `fileName`, `mimeType`, `size`, `storageKey`, `thumbnailKey`, `duration`, `checksum`, `createdAt`
- `chat_message_reads`
  - `id`, `messageId`, `userId`, `readAt`
- `chat_upload_tasks`（可选）
  - 分片上传状态管理

---

## 6. API 与事件设计

## 6.1 REST API

- `GET /chat/channels`
- `POST /chat/channels`
- `GET /chat/channels/:id/messages?cursor=...`
- `POST /chat/channels/:id/messages`
- `POST /chat/messages/:id/reactions`
- `DELETE /chat/messages/:id/reactions/:emoji`
- `POST /chat/uploads/presign`（获取上传签名）
- `POST /chat/uploads/complete`（上传完成回调）
- `GET /chat/files`

## 6.2 WebSocket 事件

- Client -> Server
  - `chat:join_channel`
  - `chat:leave_channel`
  - `chat:send_message`
  - `chat:typing`
  - `chat:read`
- Server -> Client
  - `chat:new_message`
  - `chat:message_updated`
  - `chat:message_deleted`
  - `chat:reaction_updated`
  - `chat:typing_state`
  - `chat:unread_updated`

---

## 7. 上传与媒体能力设计

## 7.1 支持类型

- 文档：pdf/doc/docx/xls/xlsx/ppt/pptx/txt/md
- 图片：png/jpg/jpeg/gif/webp
- 视频：mp4/webm/mov
- 音频：mp3/wav/m4a
- 压缩包：zip/rar/7z/tar/gz

## 7.2 上传策略

- 小文件：直传
- 大文件：分片上传 + 断点续传
- 统一做 `MIME + 扩展名 + 文件头` 三重校验
- 存储前生成 `SHA-256` 去重与审计

## 7.3 媒体处理

- 图片：缩略图生成
- 视频：首帧缩略图 + 时长提取（可选转码）
- 压缩包：仅存储与下载，不在线解压预览（降低风险）

---

## 8. 权限与安全

- 权限模型
  - 项目群：项目成员可读写
  - 私聊：仅双方可见
  - 公告频道：仅 admin/manager 发送
- 安全策略
  - 上传文件病毒扫描（异步）
  - 敏感词检测（可配置）
  - 消息审计日志（管理员可查）
  - 下载链接短时签名（防盗链）
  - 单用户上传频率限制（防刷）

---

## 9. 前端页面与组件规划

- 页面
  - `/chat`：通信主界面（三栏：会话列表 / 消息区 / 详情区）
- 组件
  - `ChatSidebar`（会话列表、搜索、未读）
  - `MessageList`（虚拟列表）
  - `MessageComposer`（文本框、emoji、附件、发送）
  - `AttachmentPicker`（文件选择、拖拽上传）
  - `ReactionBar`（消息表情）
  - `ChannelInfoDrawer`（成员、文件、公告）

---

## 10. 分阶段实施计划

## Phase 1（MVP）

1. 后端新建 `chat` 模块 + 表结构迁移  
2. WebSocket 网关 + 基础消息收发  
3. 侧边栏新增“通信”入口 + `/chat` 页面  
4. 文本/emoji/文件（含视频与压缩包）上传  
5. 未读计数与已读同步

## Phase 2（体验增强）

1. 搜索、文件中心、编辑历史  
2. 分片上传与失败重试  
3. 自定义表情包  
4. 性能优化（消息虚拟滚动、分页游标）

## Phase 3（高级能力）

1. 语音/视频通话（WebRTC）  
2. AI 摘要与任务抽取  
3. 审计中心与合规策略

---

## 11. 验收标准（关键）

- 文本消息端到端延迟 < 500ms（局域网/同地域）
- 上传成功率 > 99%
- 200MB 文件可稳定上传并下载
- 500 并发在线聊天连接可稳定收发
- 权限隔离正确（越权读取为 0）

---

## 12. 建议下一步

先落地 **Phase 1**，优先跑通“项目群聊 + 私聊 + 富附件上传 + 未读回执”闭环。  
如果你同意，我可以下一步直接给你输出：

1. 数据库 migration 草案（TypeORM）  
2. 后端 `chat` 模块目录结构与接口清单  
3. 前端 `/chat` 页面骨架与侧边栏接入改动点

