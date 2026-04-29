import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
