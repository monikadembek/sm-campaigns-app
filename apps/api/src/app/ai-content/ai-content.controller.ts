import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  UseGuards,
  Logger,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AiContentService } from './services/ai-content.service';
import {
  GenerateContentRequestDto,
  GenerateIdeasRequestDto,
} from './dto/ai-content.dto';
import {
  GenerateIdeasResponse,
  GenerateContentResponse,
} from '@sm-campaigns-app/datatypes';

type AiRequest<T> = {
  success: boolean;
  data: T;
};

@UseGuards(AuthGuard)
@Controller('ai-content')
export class AiContentController {
  private readonly logger = new Logger(AiContentController.name);

  constructor(private aiContentService: AiContentService) {}

  @Post('generate-ideas')
  async generateIdeas(
    @Body() generateIdeasData: GenerateIdeasRequestDto,
  ): Promise<AiRequest<GenerateIdeasResponse>> {
    try {
      const response =
        await this.aiContentService.generateIdeas(generateIdeasData);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error('Error in controller: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed generating ideas');
    }
  }

  @Post('generate-content')
  async generateContent(
    @Body() generateContentData: GenerateContentRequestDto,
  ): Promise<AiRequest<GenerateContentResponse>> {
    try {
      const response =
        await this.aiContentService.generatePostsContent(generateContentData);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error('Error in controller: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed generating posts');
    }
  }
}
