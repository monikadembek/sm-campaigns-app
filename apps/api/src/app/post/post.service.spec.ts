import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import { PrismaService } from '../database/prisma.service';

describe('PostService', () => {
  let service: PostService;
  let prisma: {
    campaign: { findUnique: jest.Mock };
    post: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      post: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const postInclude = { postMedia: { include: { media: true } } };

  const mockPost = {
    id: 'post-1',
    campaignId: 'campaign-1',
    ctaId: null,
    platform: 'INSTAGRAM',
    postType: 'IMAGE',
    content: 'Hello world',
    hashtags: [],
    publishDate: null,
    scheduledAt: null,
    publishedAt: null,
    status: 'DRAFT',
    errorLog: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    postMedia: [],
  };

  describe('createPost', () => {
    const dto = {
      campaignId: 'campaign-1',
      platform: 'INSTAGRAM' as const,
      postType: 'IMAGE' as const,
      content: 'Hello world',
    };

    it('should create post and return it when campaign exists', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1' });
      prisma.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost('user-123', dto);

      expect(result).toEqual(mockPost);
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: 'campaign-1',
          platform: 'INSTAGRAM',
          postType: 'IMAGE',
          content: 'Hello world',
          hashtags: [],
        }),
        include: postInclude,
      });
    });

    it('should throw NotFoundException when campaign not found', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.createPost('user-123', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('should pass hashtags: [] when hashtags not provided in dto', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1' });
      prisma.post.create.mockResolvedValue(mockPost);

      await service.createPost('user-123', dto);

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hashtags: [] }),
        }),
      );
    });

    it('should convert publishDate string to Date object', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1' });
      prisma.post.create.mockResolvedValue(mockPost);

      await service.createPost('user-123', { ...dto, publishDate: '2026-05-01' });

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publishDate: new Date('2026-05-01') }),
        }),
      );
    });

    it('should convert scheduledAt string to Date object', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1' });
      prisma.post.create.mockResolvedValue(mockPost);

      await service.createPost('user-123', { ...dto, scheduledAt: '2026-05-02' });

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduledAt: new Date('2026-05-02') }),
        }),
      );
    });

    it('should pass null for nullable date fields when null provided', async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1' });
      prisma.post.create.mockResolvedValue(mockPost);

      await service.createPost('user-123', {
        ...dto,
        publishDate: null,
        scheduledAt: null,
      });

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publishDate: null, scheduledAt: null }),
        }),
      );
    });
  });

  describe('getPost', () => {
    it('should return post when found', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await service.getPost('post-1', 'user-123');

      expect(result).toEqual(mockPost);
      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-1', campaign: { userId: 'user-123' } },
        include: postInclude,
      });
    });

    it('should return null when post not found', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      const result = await service.getPost('nonexistent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('updatePost', () => {
    it('should update and return post with only provided fields in data', async () => {
      const updated = { ...mockPost, content: 'Updated content' };
      prisma.post.update.mockResolvedValue(updated);

      const result = await service.updatePost('post-1', 'user-123', {
        content: 'Updated content',
      });

      expect(result).toEqual(updated);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1', campaign: { userId: 'user-123' } },
        data: { content: 'Updated content' },
        include: postInclude,
      });
    });

    it('should convert date strings to Date objects', async () => {
      prisma.post.update.mockResolvedValue(mockPost);

      await service.updatePost('post-1', 'user-123', {
        publishDate: '2026-05-01',
        scheduledAt: '2026-05-02',
      });

      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publishDate: new Date('2026-05-01'),
            scheduledAt: new Date('2026-05-02'),
          }),
        }),
      );
    });

    it('should allow setting dates to null', async () => {
      prisma.post.update.mockResolvedValue(mockPost);

      await service.updatePost('post-1', 'user-123', {
        publishDate: null,
        scheduledAt: null,
      });

      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publishDate: null, scheduledAt: null }),
        }),
      );
    });

    it('should propagate Prisma error when post not found', async () => {
      prisma.post.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        service.updatePost('nonexistent', 'user-123', { content: 'Test' }),
      ).rejects.toThrow('Record not found');
    });
  });

  describe('deletePost', () => {
    it('should call prisma.post.delete with compound where clause', async () => {
      prisma.post.delete.mockResolvedValue(undefined);

      await service.deletePost('post-1', 'user-123');

      expect(prisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-1', campaign: { userId: 'user-123' } },
      });
    });

    it('should propagate error when post not found', async () => {
      prisma.post.delete.mockRejectedValue(
        new Error('Record to delete does not exist.'),
      );

      await expect(
        service.deletePost('nonexistent', 'user-123'),
      ).rejects.toThrow('Record to delete does not exist.');
    });
  });
});
