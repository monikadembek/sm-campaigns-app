import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  ideaGenerationSystemPrompt,
  ideaGenerationUserPrompt,
} from '../prompts/idea-generation.prompt';
import {
  GenerateIdeasRequest,
  PostIdea,
  GenerateContentRequest,
  GenerateIdeasResponse,
  GenerateContentResponse,
  SaveDraftPostsRequest,
} from '@sm-campaigns-app/datatypes';
import { v4 as uuidv4 } from 'uuid';
import {
  contentGenerationSystemPrompt,
  contentGenerationUserPrompt,
} from '../prompts/content-generation.prompt';
import {
  MAX_OUTPUT_TOKENS_LIMIT_FOR_IDEAS,
  GPT_5_MINI_VERSION,
  MAX_OUTPUT_TOKENS_LIMIT_FOR_POSTS,
} from '../../constants';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AiContentService {
  constructor(
    private openaiService: OpenaiService,
    private prismaService: PrismaService,
  ) {}

  async generateIdeas(
    generateIdeasRequestData: GenerateIdeasRequest,
  ): Promise<GenerateIdeasResponse> {
    const systemPrompt = ideaGenerationSystemPrompt();
    const userPrompt = ideaGenerationUserPrompt(generateIdeasRequestData);
    const aiResponse = await this.openaiService.generateAiText(
      systemPrompt,
      userPrompt,
      GPT_5_MINI_VERSION,
      MAX_OUTPUT_TOKENS_LIMIT_FOR_IDEAS,
    );
    const parsedIdeas: GenerateIdeasResponse = JSON.parse(aiResponse);
    const ideas: PostIdea[] = parsedIdeas.ideas.map((idea) => ({
      ...idea,
      id: uuidv4(),
    }));
    parsedIdeas.ideas = ideas;
    return parsedIdeas;
  }

  async generatePostsContent({
    ideas,
    tone,
    topic,
  }: GenerateContentRequest): Promise<GenerateContentResponse> {
    const systemPrompt = contentGenerationSystemPrompt();
    const userPrompt = contentGenerationUserPrompt(ideas, tone, topic);
    const content = await this.openaiService.generateAiText(
      systemPrompt,
      userPrompt,
      GPT_5_MINI_VERSION,
      MAX_OUTPUT_TOKENS_LIMIT_FOR_POSTS,
    );
    return JSON.parse(content);
  }

  async saveDrafts(saveDraftPostsRequestsData: SaveDraftPostsRequest) {
    return this.prismaService.post.createMany({
      data: saveDraftPostsRequestsData.posts.map((post) => ({
        campaignId: saveDraftPostsRequestsData.campaignId,
        platform: post.platform,
        postType: post.postType,
        content: post.content,
        hashtags: post.hashtags,
        status: 'DRAFT',
      })),
    });
  }
}
