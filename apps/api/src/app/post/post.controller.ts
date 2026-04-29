import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/current-user.decorator';
import type { Post as PostType } from '@sm-campaigns-app/datatypes';
import { Prisma } from '../../generated/prisma/client';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@UseGuards(AuthGuard)
@Controller('posts')
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(private postService: PostService) {}

  @Post()
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostType> {
    try {
      return await this.postService.createPost(userId, dto);
    } catch (error) {
      this.logger.error('Error creating post: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed creating post');
    }
  }

  @Get(':id')
  async getSinglePost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PostType> {
    try {
      const post = await this.postService.getPost(id, userId);
      if (!post) {
        throw new NotFoundException(`Post with id: ${id} not found`);
      }
      return post;
    } catch (error) {
      this.logger.error(`Error fetching post with id: ${id}: `, error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed fetching post with id: ${id}`,
      );
    }
  }

  @Patch(':id')
  async editPost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostType> {
    try {
      return await this.postService.updatePost(id, userId, dto);
    } catch (error) {
      this.logger.error(`Error updating post with id ${id}: `, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Post with id: ${id} not found`);
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed updating post with id ${id}`,
      );
    }
  }

  @Delete(':id')
  async deletePost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    try {
      await this.postService.deletePost(id, userId);
      return { message: `Post with id: ${id} was successfully deleted` };
    } catch (error) {
      this.logger.error(`Error when deleting post with id ${id}: `, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Post with id: ${id} not found`);
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed deleting post with id ${id}`,
      );
    }
  }
}
