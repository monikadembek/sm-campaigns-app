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

export class UpdatePostDto {
  @IsOptional()
  @IsIn(POST_PLATFORM_TYPES)
  platform?: PlatformType;

  @IsOptional()
  @IsIn(POST_TYPE_VALUES)
  postType?: PostTypeValue;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  publishDate?: Date | string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  scheduledAt?: Date | string | null;

  @IsOptional()
  @IsIn(POST_STATUS_VALUES)
  status?: PostStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  ctaId?: string | null;
}
