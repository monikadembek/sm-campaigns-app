import type { PlatformType, PostTypeValue, PostStatus } from '@sm-campaigns-app/datatypes';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  POST_PLATFORM_TYPES,
  POST_STATUS_VALUES,
  POST_TYPE_VALUES,
} from '../post.constants';

export class CreatePostDto {
  @IsUUID()
  campaignId!: string;

  @IsIn(POST_PLATFORM_TYPES)
  platform!: PlatformType;

  @IsIn(POST_TYPE_VALUES)
  postType!: PostTypeValue;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  publishDate?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsIn(POST_STATUS_VALUES)
  status?: PostStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  ctaId?: string | null;
}
