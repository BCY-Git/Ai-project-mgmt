import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DecomposeInput {
  projectName?: string;
  projectDescription: string;
  maxTasks?: number;
}

interface DecomposeTask {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface DecomposeResult {
  summary: string;
  totalEstimatedHours: number;
  tasks: DecomposeTask[];
}

@Injectable()
export class AiService {
  private model: any | null = null;

  constructor(private readonly configService: ConfigService) {}

  async decomposeProject(input: DecomposeInput): Promise<DecomposeResult> {
    const maxTasks = Math.max(3, Math.min(input.maxTasks ?? 8, 20));
    const prompt = [
      `Project Name: ${input.projectName || 'Untitled Project'}`,
      `Project Description:\n${input.projectDescription}`,
      `Max tasks: ${maxTasks}`,
      '',
      'Output JSON schema:',
      '{"summary":"string","totalEstimatedHours":number,"tasks":[{"title":"string","description":"string","estimatedHours":number,"priority":"low|medium|high|urgent"}]}',
      'Constraints:',
      '- tasks.length <= Max tasks',
      '- estimatedHours > 0',
      '- priority must be one of low|medium|high|urgent',
    ].join('\n');

    let parsed: DecomposeResult;
    try {
      const text = await this.invokeModel(prompt);
      parsed = this.parseDecomposeResult(text);
    } catch (_error) {
      parsed = this.buildFallbackDecomposeResult(input.projectDescription, maxTasks);
    }

    if (!parsed.tasks.length) {
      throw new InternalServerErrorException('AI did not return any tasks');
    }

    return parsed;
  }

  private async getModel(): Promise<any> {
    if (this.model) {
      return this.model;
    }

    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }

    const langchainAnthropic = await this.getLangChainAnthropic();

    this.model = new langchainAnthropic.ChatAnthropic({
      apiKey,
      model: this.getConfiguredModel(),
      maxTokens: this.configService.get<number>('AI_MAX_TOKENS') || 4096,
      temperature: 0.2,
      baseUrl: this.configService.get<string>('ANTHROPIC_BASE_URL') || undefined,
      maxRetries: 0,
    });

    return this.model;
  }

  private async getLangChainAnthropic(): Promise<any> {
    try {
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      return await dynamicImport('@langchain/anthropic');
    } catch {
      throw new InternalServerErrorException(
        'LangChain package missing. Run: npm install @langchain/anthropic @langchain/core',
      );
    }
  }

  private async getLangChainMessages(): Promise<any> {
    try {
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      return await dynamicImport('@langchain/core/messages');
    } catch {
      throw new InternalServerErrorException(
        'LangChain package missing. Run: npm install @langchain/anthropic @langchain/core',
      );
    }
  }

  private async invokeModel(prompt: string): Promise<string> {
    const baseUrl = (this.configService.get<string>('ANTHROPIC_BASE_URL') || '').toLowerCase();
    if (baseUrl.includes('siliconflow.cn')) {
      return this.invokeSiliconFlow(prompt);
    }

    try {
      const { SystemMessage, HumanMessage } = await this.getLangChainMessages();
      const response = await (await this.getModel()).invoke([
        new SystemMessage(this.getSystemPrompt()),
        new HumanMessage(prompt),
      ]);
      return this.getMessageText(response.content);
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  private async invokeSiliconFlow(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }

    const model = this.getConfiguredModel();
    const maxTokens = this.configService.get<number>('AI_MAX_TOKENS') || 1024;
    const timeoutMs = this.getSafeTimeoutMs();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: Math.min(maxTokens, 2048),
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
        message?: string;
      };

      if (!response.ok) {
        throw new BadRequestException(data?.error?.message || data?.message || `AI provider error: ${response.status}`);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new InternalServerErrorException('AI returned empty content');
      }
      return content;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw this.toProviderError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  private getConfiguredModel(): string {
    return (
      this.configService.get<string>('ANTHROPIC_MODEL') ||
      this.configService.get<string>('AI_MODEL') ||
      'claude-3-5-sonnet-latest'
    );
  }

  private toProviderError(error: unknown): BadRequestException | InternalServerErrorException {
    const maybeMessage =
      (error as { error?: { message?: string }; message?: string })?.error?.message ||
      (error as { message?: string })?.message;

    const message = String(maybeMessage || '');
    if (message) {
      return new BadRequestException(`AI provider error: ${message}`);
    }

    return new InternalServerErrorException('AI provider request failed');
  }

  private getSafeTimeoutMs(): number {
    const raw = Number(this.configService.get<string>('API_TIMEOUT_MS') || 30000);
    if (!Number.isFinite(raw) || raw <= 0) {
      return 30000;
    }
    // avoid extremely long waiting in UI
    return Math.min(Math.max(raw, 5000), 60000);
  }

  private getSystemPrompt(): string {
    return [
      'You are a senior technical project manager for software delivery.',
      'Your goal is to decompose project requirements into implementation-ready tasks.',
      '',
      'Rules:',
      '1) Tasks must be atomic, actionable, and testable.',
      '2) Each task must include: title, description, estimatedHours, priority.',
      '3) Prefer 4-16h per task; split oversized work.',
      '4) Cover full lifecycle when applicable: requirements, design, implementation, testing, release.',
      '5) Remove duplicates and keep tasks logically ordered.',
      '6) Priority rubric:',
      '   - urgent: release-blocking, security, compliance',
      '   - high: critical path / core capability',
      '   - medium: important but not blocking',
      '   - low: optimization / nice-to-have',
      '7) If requirements are ambiguous, state minimal assumptions in summary.',
      '8) Output JSON only. No markdown. No extra keys.',
    ].join('\n');
  }

  private getMessageText(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) {
            return String((item as { text?: unknown }).text || '');
          }
          return '';
        })
        .join('\n');
    }

    return String(content || '');
  }

  private parseDecomposeResult(raw: string): DecomposeResult {
    const jsonText = this.extractJson(raw);
    const parsed = JSON.parse(jsonText) as Partial<DecomposeResult>;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const normalizedTasks: DecomposeTask[] = tasks
      .map((task) => ({
        title: String(task?.title || '').trim(),
        description: String(task?.description || '').trim(),
        estimatedHours: this.toPositiveNumber(task?.estimatedHours),
        priority: this.normalizePriority(task?.priority),
      }))
      .filter((task) => task.title.length > 0);

    const totalEstimatedHours =
      this.toPositiveNumber(parsed.totalEstimatedHours) ||
      normalizedTasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    return {
      summary: String(parsed.summary || '').trim() || 'AI decomposition result',
      totalEstimatedHours,
      tasks: normalizedTasks,
    };
  }

  private extractJson(raw: string): string {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new InternalServerErrorException('AI response is not valid JSON');
    }

    return raw.slice(start, end + 1);
  }

  private toPositiveNumber(value: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      return 1;
    }
    return Math.round(num * 10) / 10;
  }

  private normalizePriority(value: unknown): 'low' | 'medium' | 'high' | 'urgent' {
    const text = String(value || '').toLowerCase().trim();
    if (text === 'low' || text === 'medium' || text === 'high' || text === 'urgent') {
      return text;
    }
    return 'medium';
  }

  private buildFallbackDecomposeResult(projectDescription: string, maxTasks: number): DecomposeResult {
    const cleaned = projectDescription
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const objectives = this.extractObjectives(cleaned);
    const phaseTemplates = this.buildPhaseTemplates(objectives);
    const tasks = phaseTemplates.slice(0, maxTasks).map((task, index) => {
      const priority: DecomposeTask['priority'] =
        index === 0 || task.phase === '开发实现'
          ? 'high'
          : task.phase === '测试验收' || task.phase === '上线交付'
            ? 'medium'
            : 'high';
      return {
        title: `${task.phase} - ${task.title}`,
        description: task.description,
        estimatedHours: task.estimatedHours,
        priority,
      };
    });

    return {
      summary: '当前 AI 服务不可用，已返回阶段化 PM 拆解结果（可编辑后再创建任务）。',
      totalEstimatedHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      tasks,
    };
  }

  private extractObjectives(text: string): string[] {
    const segments = text
      .split(/\n{2,}|[。！？.!?]/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 8);

    const unique: string[] = [];
    for (const segment of segments) {
      const concise = segment.length > 28 ? `${segment.slice(0, 28)}...` : segment;
      if (!unique.includes(concise)) {
        unique.push(concise);
      }
      if (unique.length >= 5) break;
    }

    if (unique.length === 0) {
      return ['明确业务目标与关键验收标准'];
    }
    return unique;
  }

  private buildPhaseTemplates(objectives: string[]): Array<{
    phase: '需求分析' | '方案设计' | '开发实现' | '测试验收' | '上线交付';
    title: string;
    description: string;
    estimatedHours: number;
  }> {
    const objectiveText = objectives.join('；');
    const coreObjective = objectives[0];

    return [
      {
        phase: '需求分析',
        title: '需求澄清与范围界定',
        description: `整理输入需求，明确业务目标、边界、角色与验收口径；重点覆盖：${objectiveText}。`,
        estimatedHours: 6,
      },
      {
        phase: '需求分析',
        title: '任务拆分与里程碑规划',
        description: '将目标拆为可执行工作包，定义里程碑、优先级及关键依赖关系。',
        estimatedHours: 5,
      },
      {
        phase: '方案设计',
        title: '技术方案与数据流设计',
        description: `围绕“${coreObjective}”输出模块设计、接口契约与关键流程图。`,
        estimatedHours: 8,
      },
      {
        phase: '开发实现',
        title: '核心功能开发',
        description: '按优先级实现核心能力，补齐必要日志、异常处理与权限控制。',
        estimatedHours: 16,
      },
      {
        phase: '开发实现',
        title: '联调与集成',
        description: '完成前后端/上下游联调，修复阻塞问题并验证关键业务闭环。',
        estimatedHours: 10,
      },
      {
        phase: '测试验收',
        title: '测试用例执行与缺陷修复',
        description: '执行冒烟与主流程回归，跟踪修复高优先级缺陷并复测闭环。',
        estimatedHours: 10,
      },
      {
        phase: '测试验收',
        title: '业务验收准备',
        description: '整理验收清单、演示脚本与交付说明，确保可签收。',
        estimatedHours: 6,
      },
      {
        phase: '上线交付',
        title: '上线发布与回滚预案',
        description: '制定发布步骤、风险点、监控指标及回滚方案，保障上线稳定。',
        estimatedHours: 5,
      },
      {
        phase: '上线交付',
        title: '上线后观察与优化',
        description: '跟踪关键指标与用户反馈，形成首轮优化任务池。',
        estimatedHours: 4,
      },
    ];
  }
}
