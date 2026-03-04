import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiInputParserService } from './ai-input-parser.service';

@Module({
  providers: [AiService, AiInputParserService],
  exports: [AiService, AiInputParserService],
})
export class AiModule {}
