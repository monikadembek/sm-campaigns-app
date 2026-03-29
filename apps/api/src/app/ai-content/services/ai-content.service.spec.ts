import { Test, TestingModule } from '@nestjs/testing';
import { AiContentService } from './ai-content.service';
import { OpenaiService } from './openai.service';
import { PrismaService } from '../../database/prisma.service';
import {
  GenerateIdeasRequest,
  GenerateContentRequest,
  SaveDraftPostsRequest,
  PostIdea,
} from '@sm-campaigns-app/datatypes';
import {
  GPT_5_MINI_VERSION,
  MAX_OUTPUT_TOKENS_LIMIT_FOR_IDEAS,
  MAX_OUTPUT_TOKENS_LIMIT_FOR_POSTS,
} from '../../constants';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('AiContentService', () => {
  let service: AiContentService;
  let openaiService: jest.Mocked<OpenaiService>;
  let prismaService: { post: { createMany: jest.Mock } };

  beforeEach(async () => {
    prismaService = {
      post: {
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiContentService,
        {
          provide: OpenaiService,
          useValue: {
            generateAiText: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AiContentService>(AiContentService);
    openaiService = module.get(OpenaiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateIdeas', () => {
    const mockRequest: GenerateIdeasRequest = {
      topic: 'AI in healthcare',
      platforms: ['TWITTER', 'LINKEDIN'],
      tone: 'PROFESSIONAL',
      numberOfIdeas: 2,
    };

    const mockAiResponse = JSON.stringify({
      ideas: [
        {
          title: 'AI Diagnostics Revolution',
          summary: 'How AI is transforming medical diagnostics',
          platform: 'TWITTER',
          suggestedPostType: 'TEXT',
        },
        {
          title: 'Healthcare AI Trends',
          summary: 'Top trends in AI-powered healthcare for 2026',
          platform: 'LINKEDIN',
          suggestedPostType: 'CAROUSEL',
        },
      ],
    });

    it('should call openaiService.generateAiText with correct parameters', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      await service.generateIdeas(mockRequest);

      expect(openaiService.generateAiText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        GPT_5_MINI_VERSION,
        MAX_OUTPUT_TOKENS_LIMIT_FOR_IDEAS,
      );
    });

    it('should parse the AI response and add UUIDs to each idea', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      const result = await service.generateIdeas(mockRequest);

      expect(result.ideas).toHaveLength(2);
      result.ideas.forEach((idea) => {
        expect(idea.id).toBe('mock-uuid-1234');
      });
    });

    it('should preserve original idea properties', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      const result = await service.generateIdeas(mockRequest);

      expect(result.ideas[0]).toEqual({
        id: 'mock-uuid-1234',
        title: 'AI Diagnostics Revolution',
        summary: 'How AI is transforming medical diagnostics',
        platform: 'TWITTER',
        suggestedPostType: 'TEXT',
      });
    });

    it('should include additionalContext in prompt when provided', async () => {
      const requestWithContext: GenerateIdeasRequest = {
        ...mockRequest,
        additionalContext: 'Focus on startups',
      };
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      await service.generateIdeas(requestWithContext);

      const userPromptArg =
        openaiService.generateAiText.mock.calls[0][1];
      expect(userPromptArg).toContain('Focus on startups');
    });

    it('should throw when AI returns invalid JSON', async () => {
      openaiService.generateAiText.mockResolvedValue('not valid json');

      await expect(service.generateIdeas(mockRequest)).rejects.toThrow();
    });
  });

  describe('generatePostsContent', () => {
    const mockIdeas: PostIdea[] = [
      {
        id: 'idea-1',
        title: 'AI Diagnostics',
        summary: 'AI in medical diagnostics',
        platform: 'TWITTER',
        suggestedPostType: 'TEXT',
      },
    ];

    const mockRequest: GenerateContentRequest = {
      ideas: mockIdeas,
      tone: 'PROFESSIONAL',
      topic: 'AI in healthcare',
    };

    const mockAiResponse = JSON.stringify({
      posts: [
        {
          ideaId: 'idea-1',
          platform: 'TWITTER',
          postType: 'TEXT',
          content:
            'AI is revolutionizing medical diagnostics with unprecedented accuracy.',
          hashtags: ['AIHealthcare', 'MedTech'],
        },
      ],
    });

    it('should call openaiService.generateAiText with correct parameters', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      await service.generatePostsContent(mockRequest);

      expect(openaiService.generateAiText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        GPT_5_MINI_VERSION,
        MAX_OUTPUT_TOKENS_LIMIT_FOR_POSTS,
      );
    });

    it('should return parsed content response', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      const result = await service.generatePostsContent(mockRequest);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toEqual({
        ideaId: 'idea-1',
        platform: 'TWITTER',
        postType: 'TEXT',
        content:
          'AI is revolutionizing medical diagnostics with unprecedented accuracy.',
        hashtags: ['AIHealthcare', 'MedTech'],
      });
    });

    it('should pass ideas, tone, and topic to the user prompt', async () => {
      openaiService.generateAiText.mockResolvedValue(mockAiResponse);

      await service.generatePostsContent(mockRequest);

      const userPromptArg =
        openaiService.generateAiText.mock.calls[0][1];
      expect(userPromptArg).toContain('AI in healthcare');
      expect(userPromptArg).toContain('PROFESSIONAL');
      expect(userPromptArg).toContain('AI Diagnostics');
    });

    it('should throw when AI returns invalid JSON', async () => {
      openaiService.generateAiText.mockResolvedValue('invalid json');

      await expect(
        service.generatePostsContent(mockRequest),
      ).rejects.toThrow();
    });
  });

  describe('saveDrafts', () => {
    const mockRequest: SaveDraftPostsRequest = {
      campaignId: '550e8400-e29b-41d4-a716-446655440099',
      posts: [
        {
          platform: 'INSTAGRAM',
          postType: 'CAROUSEL',
          content: 'Summer is here!',
          hashtags: ['#Summer', '#Deals'],
        },
        {
          platform: 'TWITTER',
          postType: 'TEXT',
          content: 'Hot deals dropping now!',
          hashtags: ['#HotDeals'],
        },
      ],
    };

    it('should call prisma createMany with correct data', async () => {
      prismaService.post.createMany.mockResolvedValue({ count: 2 });

      await service.saveDrafts(mockRequest);

      expect(prismaService.post.createMany).toHaveBeenCalledWith({
        data: [
          {
            campaignId: '550e8400-e29b-41d4-a716-446655440099',
            platform: 'INSTAGRAM',
            postType: 'CAROUSEL',
            content: 'Summer is here!',
            hashtags: ['#Summer', '#Deals'],
            status: 'DRAFT',
          },
          {
            campaignId: '550e8400-e29b-41d4-a716-446655440099',
            platform: 'TWITTER',
            postType: 'TEXT',
            content: 'Hot deals dropping now!',
            hashtags: ['#HotDeals'],
            status: 'DRAFT',
          },
        ],
      });
    });

    it('should return the createMany result', async () => {
      const mockResult = { count: 2 };
      prismaService.post.createMany.mockResolvedValue(mockResult);

      const result = await service.saveDrafts(mockRequest);

      expect(result).toEqual(mockResult);
    });

    it('should set status to DRAFT for all posts', async () => {
      prismaService.post.createMany.mockResolvedValue({ count: 2 });

      await service.saveDrafts(mockRequest);

      const callArgs = prismaService.post.createMany.mock.calls[0][0];
      callArgs.data.forEach((post: { status: string }) => {
        expect(post.status).toBe('DRAFT');
      });
    });

    it('should throw when database operation fails', async () => {
      prismaService.post.createMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.saveDrafts(mockRequest)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
