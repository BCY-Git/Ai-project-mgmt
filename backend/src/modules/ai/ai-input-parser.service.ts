import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.docx', '.pdf']);
const SUPPORTED_MIME_PARTS = ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_TEXT_LENGTH = 30000;

export interface UploadedInputFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AiInputParserService {
  async parseFromUpload(file: UploadedInputFile): Promise<string> {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('仅支持 txt/md/docx/pdf 文件');
    }

    const mime = (file.mimetype || '').toLowerCase();
    const mimeAllowed =
      !mime ||
      SUPPORTED_MIME_PARTS.some((item) => mime.includes(item)) ||
      (ext === '.md' && mime.includes('text')) ||
      (ext === '.txt' && mime.includes('text'));
    if (!mimeAllowed) {
      throw new BadRequestException('文件 MIME 类型不匹配，请检查文件格式');
    }

    if (!file.buffer || !file.buffer.length) {
      throw new BadRequestException('上传文件内容为空');
    }

    return this.normalizeText(await this.parseByExtension(ext, file.buffer));
  }

  private async parseByExtension(ext: string, buffer: Buffer): Promise<string> {
    if (ext === '.txt' || ext === '.md') {
      return buffer.toString('utf-8');
    }

    if (ext === '.docx') {
      return this.parseDocx(buffer);
    }

    if (ext === '.pdf') {
      return this.parsePdf(buffer);
    }

    throw new BadRequestException('不支持的文件类型');
  }

  private async parseDocx(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await this.getMammoth();
      const result = await mammoth.extractRawText({ buffer });
      const text = result?.value;
      if (typeof text !== 'string' || !text.trim()) {
        throw new BadRequestException('DOCX 文件未提取到有效文本');
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('DOCX 解析失败，请确认文件未损坏');
    }
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const pdfParse = await this.getPdfParse();
      const result = await pdfParse(buffer);
      const text = result?.text;
      if (typeof text !== 'string' || !text.trim()) {
        throw new BadRequestException('PDF 文件未提取到有效文本');
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('PDF 解析失败，请确认文件未损坏');
    }
  }

  private normalizeText(raw: string): string {
    const normalized = raw
      .replace(/\u0000/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!normalized) {
      throw new BadRequestException('文档内容为空，无法进行 AI 拆解');
    }

    if (normalized.length > MAX_TEXT_LENGTH) {
      return normalized.slice(0, MAX_TEXT_LENGTH);
    }

    return normalized;
  }

  private async getMammoth(): Promise<{ extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }> }> {
    try {
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      const mod = await dynamicImport('mammoth');
      return mod.default || mod;
    } catch {
      throw new InternalServerErrorException('缺少 DOCX 解析依赖，请安装 mammoth');
    }
  }

  private async getPdfParse(): Promise<(buffer: Buffer) => Promise<{ text: string }>> {
    try {
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      const mod = await dynamicImport('pdf-parse');
      return mod.default || mod;
    } catch {
      throw new InternalServerErrorException('缺少 PDF 解析依赖，请安装 pdf-parse');
    }
  }
}
