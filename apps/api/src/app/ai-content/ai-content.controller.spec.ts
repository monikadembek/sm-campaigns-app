import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { AiContentController } from './ai-content.controller';
import { AiContentService } from './services/ai-content.service';
import {
  GenerateIdeasRequestDto,
  GenerateContentRequestDto,
  SaveDraftPostsRequestDto,
} from './dto/ai-content.dto';
import {
  GenerateIdeasResponse,
  GenerateContentResponse,
} from '@sm-campaigns-app/datatypes';

describe('AiContentController', () => {
  let controller: AiContentController;
  let aiContentService: jest.Mocked<AiContentService>;

  const mockIdeasRequest: GenerateIdeasRequestDto = {
    topic: 'Summer Sale Campaign',
    platforms: ['INSTAGRAM', 'TWITTER'],
    tone: 'CASUAL',
    numberOfIdeas: 3,
    additionalContext: 'Target audience is Gen Z',
  };

  const mockIdeasResponse: GenerateIdeasResponse = {
    ideas: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Summer vibes post',
        summary: 'A fun post about summer deals',
        platform: 'INSTAGRAM',
        suggestedPostType: 'CAROUSEL',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Hot deals thread',
        summary: 'A Twitter thread about summer sales',
        platform: 'TWITTER',
        suggestedPostType: 'TEXT',
      },
    ],
  };

  const mockContentRequest: GenerateContentRequestDto = {
    topic: 'Summer Sale Campaign',
    ideas: mockIdeasResponse.ideas,
    tone: 'CASUAL',
  };

  const mockContentResponse: GenerateContentResponse = {
    posts: [
      {
        ideaId: '550e8400-e29b-41d4-a716-446655440001',
        platform: 'INSTAGRAM',
        postType: 'CAROUSEL',
        content: 'Summer is here and so are our deals!',
        hashtags: ['#SummerSale', '#Deals'],
      },
    ],
  };

  beforeEach(async () => {
    const mockAiContentService = {
      generateIdeas: jest.fn(),
      generatePostsContent: jest.fn(),
      saveDrafts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiContentController],
      providers: [
        { provide: AiContentService, useValue: mockAiContentService },
      ],
    }).compile();

    controller = module.get<AiContentController>(AiContentController);
    aiContentService = module.get(AiContentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateIdeas', () => {
    it('should return success response with generated ideas', async () => {
      aiContentService.generateIdeas.mockResolvedValue(mockIdeasResponse);

      const result = await controller.generateIdeas(mockIdeasRequest);

      expect(result).toEqual({
        success: true,
        data: mockIdeasResponse,
      });
      expect(aiContentService.generateIdeas).toHaveBeenCalledWith(
        mockIdeasRequest,
      );
    });

    it('should re-throw HttpException from service', async () => {
      const httpError = new BadRequestException('Invalid platforms');
      aiContentService.generateIdeas.mockRejectedValue(httpError);

      await expect(controller.generateIdeas(mockIdeasRequest)).rejects.toThrow(
        httpError,
      );
    });

    it('should throw InternalServerErrorException for non-HTTP errors', async () => {
      aiContentService.generateIdeas.mockRejectedValue(
        new Error('OpenAI API failure'),
      );

      await expect(controller.generateIdeas(mockIdeasRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.generateIdeas(mockIdeasRequest)).rejects.toThrow(
        'Failed generating ideas',
      );
    });
  });

  describe('generateContent', () => {
    it('should return success response with generated content', async () => {
      aiContentService.generatePostsContent.mockResolvedValue(
        mockContentResponse,
      );

      const result = await controller.generateContent(mockContentRequest);

      expect(result).toEqual({
        success: true,
        data: mockContentResponse,
      });
      expect(aiContentService.generatePostsContent).toHaveBeenCalledWith(
        mockContentRequest,
      );
    });

    it('should re-throw HttpException from service', async () => {
      const httpError = new BadRequestException('Invalid tone');
      aiContentService.generatePostsContent.mockRejectedValue(httpError);

      await expect(
        controller.generateContent(mockContentRequest),
      ).rejects.toThrow(httpError);
    });

    it('should throw InternalServerErrorException for non-HTTP errors', async () => {
      aiContentService.generatePostsContent.mockRejectedValue(
        new Error('OpenAI API failure'),
      );

      await expect(
        controller.generateContent(mockContentRequest),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        controller.generateContent(mockContentRequest),
      ).rejects.toThrow('Failed generating posts');
    });
  });

  describe('saveDrafts', () => {
    const mockSaveDraftsRequest: SaveDraftPostsRequestDto = {
      campaignId: '550e8400-e29b-41d4-a716-446655440099',
      posts: [
        {
          platform: 'INSTAGRAM',
          postType: 'CAROUSEL',
          content: 'Summer is here and so are our deals!',
          hashtags: ['#SummerSale', '#Deals'],
        },
        {
          platform: 'TWITTER',
          postType: 'TEXT',
          content: 'Hot deals dropping now!',
          hashtags: ['#HotDeals'],
        },
      ],
    };

    const mockSaveDraftsResponse = { count: 2 };

    it('should return success response with saved drafts data', async () => {
      aiContentService.saveDrafts.mockResolvedValue(mockSaveDraftsResponse);

      const result = await controller.saveDrafts(mockSaveDraftsRequest);

      expect(result).toEqual({
        success: true,
        data: mockSaveDraftsResponse,
      });
      expect(aiContentService.saveDrafts).toHaveBeenCalledWith(
        mockSaveDraftsRequest,
      );
    });

    it('should re-throw HttpException from service', async () => {
      const httpError = new BadRequestException('Invalid campaign ID');
      aiContentService.saveDrafts.mockRejectedValue(httpError);

      await expect(
        controller.saveDrafts(mockSaveDraftsRequest),
      ).rejects.toThrow(httpError);
    });

    it('should throw InternalServerErrorException for non-HTTP errors', async () => {
      aiContentService.saveDrafts.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.saveDrafts(mockSaveDraftsRequest),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        controller.saveDrafts(mockSaveDraftsRequest),
      ).rejects.toThrow('Failed saving post drafts');
    });
  });
});
