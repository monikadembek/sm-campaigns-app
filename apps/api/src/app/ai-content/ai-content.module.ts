import { Module } from '@nestjs/common';
import { OpenaiService } from './services/openai.service';
import { AiContentController } from './ai-content.controller';
import { AiContentService } from './services/ai-content.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [OpenaiService, AiContentService],
  controllers: [AiContentController],
})
export class AiContentModule {}
