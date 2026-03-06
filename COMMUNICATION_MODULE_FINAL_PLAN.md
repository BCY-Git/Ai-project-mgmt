# 侧边栏通信模块终版方案（融合版）

> 基于两版方案优点融合：  
> - 保留“架构治理 + 安全 + 验收指标”  
> - 引入“组件拆分 + 协议表 + 上传时序图 + 阶段排期”

## 1. 目标

在侧边栏新增一级菜单 **通信**（`/chat`），构建项目协作 IM，支持：

- 文字、Emoji、图片、文件、视频、音频、压缩包
- 回复、撤回、编辑、反应、已读、未读角标
- 项目群聊、私聊、群聊、公告频道
- 大文件分片上传与媒体处理

## 2. 信息架构

- 侧边栏一级：`通信`
- 通信页三栏：
  1. 会话列表（搜索/未读/在线态）
  2. 消息区（虚拟列表）
  3. 详情区（成员/文件/公告）

会话类型：

- `project_channel`（项目群）
- `direct`（私聊）
- `group`（普通群）
- `announcement`（公告频道）

## 3. 功能优先级

## P0（MVP）

- 文本消息实时收发（WebSocket）
- Emoji 面板（系统 emoji）
- 文件上传（文档/图片/压缩包）
- 视频文件上传与播放
- 会话未读、会话已读
- 回复、撤回（2 分钟）
- 项目群自动创建与入群

## P1（增强）

- 富文本（Markdown/代码块高亮）
- 消息编辑历史
- 分片上传、断点续传、失败重试
- 自定义表情包
- 全文检索（关键词/发送人/时间）
- 文件中心（按项目/会话过滤）

## P2（高级）

- 语音消息与录制
- 实时音视频通话（WebRTC）
- 屏幕共享
- AI 摘要/待办抽取

## 4. 技术方案（贴合当前仓库）

后端：NestJS + TypeORM + PostgreSQL + Redis + Bull  
前端：React + shadcn/ui + socket.io-client

- 实时层：`@WebSocketGateway + socket.io`
- 文件层：MinIO / S3（预签名 URL）
- 队列：Bull（缩略图、转码、扫描、通知）
- 缓存：Redis（在线状态、未读计数）
- UI：shadcn（Sheet/Popover/Dialog/ScrollArea/ContextMenu/Tooltip）

## 5. 数据模型（核心）

- `chat_channels`
- `chat_channel_members`
- `chat_messages`
- `chat_attachments`
- `chat_message_reactions`
- `chat_message_reads`

关键约束：

- 成员唯一键：`(channelId, userId)`
- 消息表 `type` 枚举可扩展
- 附件表记录 `mime/size/storageKey/thumbnail/duration/checksum`

## 6. API + WS 协议（统一命名）

## REST

- `GET /chat/channels`
- `POST /chat/channels`
- `GET /chat/channels/:id/messages?before&limit`
- `POST /chat/channels/:id/messages`
- `POST /chat/channels/:id/read`
- `POST /chat/uploads/presign`
- `POST /chat/uploads/complete`

## WebSocket

Client -> Server:

- `chat:join_channel`
- `chat:leave_channel`
- `chat:send_message`
- `chat:typing`
- `chat:read`

Server -> Client:

- `chat:new_message`
- `chat:message_updated`
- `chat:message_deleted`
- `chat:reaction_updated`
- `chat:typing_state`
- `chat:unread_updated`

## 7. 上传与媒体策略

- 小文件（<10MB）：直传
- 大文件（>=10MB）：分片上传 + 合并
- 校验：扩展名 + MIME + 文件头
- 审计：SHA-256、上传人、时间、IP
- 视频：首帧缩略图 + 时长提取（可选转码）
- 压缩包：仅下载，不在线解压执行；目录预览需沙箱化扫描后开启

## 8. 安全与权限

- 项目群：项目成员可读写
- 私聊：仅会话双方可见
- 公告频道：admin/manager 发言
- 下载链接：短时签名
- 异步病毒扫描与敏感词检测
- 限流：按用户上传速率与消息频率
- 审计日志：消息操作/文件操作可追踪

## 9. 前端实现拆分

- `ChatSidebar`（会话列表）
- `ChatWindow`（消息列表+输入区）
- `MessageBubble/*`（文本/图片/文件/视频/音频/压缩包）
- `InputToolbar`（emoji/附件/发送）
- `useSocket` / `useMessages` / `useFileUpload`

## 10. 后端实现拆分

- `chat.module.ts`
- `chat.controller.ts`
- `chat.gateway.ts`
- `chat.service.ts`
- `entities/*`
- `dto/*`

## 11. 分阶段执行计划（可直接排期）

## Phase 1（2 周）— 先跑通闭环

1. 侧边栏通信入口 + `/chat` 页面骨架  
2. 会话/消息表结构 + 基础 REST  
3. WebSocket 基础收发 + 已读  
4. 文本消息 + Emoji  
5. 文件上传最小能力（文档/图片/压缩包）

## Phase 2（2 周）— 富媒体

1. 视频上传/预览  
2. 分片上传/断点续传  
3. 回复/撤回/反应/搜索  
4. 文件中心

## Phase 3（2 周）— 高级协同

1. 语音/音视频  
2. AI 摘要/待办抽取  
3. 管理审计中心

## 12. 验收指标

- 文本消息延迟：P95 < 500ms
- 上传成功率：> 99%
- 200MB 文件稳定上传下载
- 500 并发连接稳定
- 越权读取 0 漏洞

## 13. 当前已启动执行（本仓库）

- 已新增侧边栏“通信”入口与 `/chat` 页面
- 已搭建 Chat 模块后端骨架（Controller/Service/Gateway/Entity）
- 已打通基础文本会话与消息 API（MVP 起步）

