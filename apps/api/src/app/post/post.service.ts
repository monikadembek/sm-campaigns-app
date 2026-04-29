import { Injectable, NotFoundException } from '@nestjs/common';
import type { Post } from '@sm-campaigns-app/datatypes';
import type {
  PostUncheckedCreateInput,
  PostUncheckedUpdateInput,
} from '../../generated/prisma/models/Post.js';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  private postInclude = { postMedia: { include: { media: true } } };

  async createPost(userId: string, dto: CreatePostDto): Promise<Post> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId, userId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const data: PostUncheckedCreateInput = {
      campaignId: dto.campaignId,
      platform: dto.platform,
      postType: dto.postType,
      content: dto.content,
      hashtags: dto.hashtags ?? [],
    };

    if ('ctaId' in dto) data.ctaId = dto.ctaId;

    if ('publishDate' in dto) {
      data.publishDate =
        dto.publishDate == null ? null : new Date(dto.publishDate as string);
    }

    if ('scheduledAt' in dto) {
      data.scheduledAt =
        dto.scheduledAt == null ? null : new Date(dto.scheduledAt as string);
    }

    if ('status' in dto) data.status = dto.status;

    const post = await this.prisma.post.create({
      data,
      include: this.postInclude,
    });

    return post as unknown as Post;
  }

  async getPost(id: string, userId: string): Promise<Post | null> {
    const post = await this.prisma.post.findUnique({
      where: { id, campaign: { userId } },
      include: this.postInclude,
    });

    return post as unknown as Post | null;
  }

  async updatePost(id: string, userId: string, dto: UpdatePostDto): Promise<Post> {
    const data: PostUncheckedUpdateInput = {};

    if ('platform' in dto) data.platform = dto.platform;
    if ('postType' in dto) data.postType = dto.postType;
    if ('content' in dto) data.content = dto.content;
    if ('hashtags' in dto) data.hashtags = dto.hashtags;
    if ('status' in dto) data.status = dto.status;
    if ('ctaId' in dto) data.ctaId = dto.ctaId;

    if ('publishDate' in dto) {
      data.publishDate =
        dto.publishDate == null ? null : new Date(dto.publishDate as string);
    }

    if ('scheduledAt' in dto) {
      data.scheduledAt =
        dto.scheduledAt == null ? null : new Date(dto.scheduledAt as string);
    }

    const post = await this.prisma.post.update({
      where: { id, campaign: { userId } },
      data,
      include: this.postInclude,
    });

    return post as unknown as Post;
  }

  async deletePost(id: string, userId: string): Promise<void> {
    await this.prisma.post.delete({
      where: { id, campaign: { userId } },
    });
  }
}
