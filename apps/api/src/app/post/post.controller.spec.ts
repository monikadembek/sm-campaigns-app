import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Prisma } from '../../generated/prisma/client';

jest.mock('../auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('PostController', () => {
  let controller: PostController;
  let service: {
    createPost: jest.Mock;
    getPost: jest.Mock;
    updatePost: jest.Mock;
    deletePost: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createPost: jest.fn(),
      getPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [{ provide: PostService, useValue: service }],
    }).compile();

    controller = module.get<PostController>(PostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

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

    it('should return created post when service succeeds', async () => {
      service.createPost.mockResolvedValue(mockPost);

      const result = await controller.createPost('user-123', dto);

      expect(result).toEqual(mockPost);
      expect(service.createPost).toHaveBeenCalledWith('user-123', dto);
    });

    it('should throw InternalServerErrorException when service throws generic error', async () => {
      service.createPost.mockRejectedValue(new Error('DB error'));

      await expect(controller.createPost('user-123', dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getSinglePost', () => {
    it('should return post when service returns a record', async () => {
      service.getPost.mockResolvedValue(mockPost);

      const result = await controller.getSinglePost('post-1', 'user-123');

      expect(result).toEqual(mockPost);
      expect(service.getPost).toHaveBeenCalledWith('post-1', 'user-123');
    });

    it('should throw NotFoundException when service returns null', async () => {
      service.getPost.mockResolvedValue(null);

      await expect(
        controller.getSinglePost('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when service throws generic error', async () => {
      service.getPost.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.getSinglePost('post-1', 'user-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('editPost', () => {
    it('should return updated post on success', async () => {
      const updated = { ...mockPost, content: 'Updated' };
      service.updatePost.mockResolvedValue(updated);

      const result = await controller.editPost('user-123', 'post-1', {
        content: 'Updated',
      });

      expect(result).toEqual(updated);
      expect(service.updatePost).toHaveBeenCalledWith('post-1', 'user-123', {
        content: 'Updated',
      });
    });

    it('should throw NotFoundException on PrismaClientKnownRequestError P2025', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      service.updatePost.mockRejectedValue(error);

      await expect(
        controller.editPost('user-123', 'nonexistent', { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      service.updatePost.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.editPost('user-123', 'post-1', { content: 'Test' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deletePost', () => {
    it('should return success message on delete', async () => {
      service.deletePost.mockResolvedValue(undefined);

      const result = await controller.deletePost('user-123', 'post-1');

      expect(result).toEqual({
        message: 'Post with id: post-1 was successfully deleted',
      });
      expect(service.deletePost).toHaveBeenCalledWith('post-1', 'user-123');
    });

    it('should throw NotFoundException on P2025', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      service.deletePost.mockRejectedValue(error);

      await expect(
        controller.deletePost('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      service.deletePost.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.deletePost('user-123', 'post-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
