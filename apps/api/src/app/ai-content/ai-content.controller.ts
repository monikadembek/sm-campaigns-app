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
  SaveDraftPostsRequestDto,
} from './dto/ai-content.dto';
import {
  GenerateIdeasResponse,
  GenerateContentResponse,
} from '@sm-campaigns-app/datatypes';

type AiResponse<T> = {
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
  ): Promise<AiResponse<GenerateIdeasResponse>> {
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
  ): Promise<AiResponse<GenerateContentResponse>> {
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

  @Post('save-drafts')
  async saveDrafts(
    @Body() saveDraftPostsRequestDto: SaveDraftPostsRequestDto,
  ): Promise<AiResponse<{ count: number }>> {
    try {
      const response = await this.aiContentService.saveDrafts(
        saveDraftPostsRequestDto,
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error('Error in controller: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed saving post drafts');
    }
  }
}
