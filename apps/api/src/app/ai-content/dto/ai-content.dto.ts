import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PlatformType,
  PostIdea,
  ToneStyle,
  PostTypeValue,
} from '@sm-campaigns-app/datatypes';

const VALID_PLATFORMS: PlatformType[] = [
  'INSTAGRAM',
  'TWITTER',
  'FACEBOOK',
  'LINKEDIN',
  'TIKTOK',
  'YOUTUBE',
  'PINTEREST',
];

const POST_TYPE_VALUE = [
  'IMAGE',
  'VIDEO',
  'CAROUSEL',
  'REEL',
  'STORY',
  'TEXT',
  'LINK',
  'POLL',
];

export class GenerateIdeasRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  topic!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VALID_PLATFORMS, { each: true })
  platforms!: PlatformType[];

  @IsIn(['PROFESSIONAL', 'CASUAL', 'HUMOROUS', 'INSPIRATIONAL'])
  tone!: ToneStyle;

  @IsInt()
  @Min(1)
  @Max(100)
  numberOfIdeas!: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  additionalContext?: string;
}

export class PostIdeaDto {
  @IsUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  summary!: string;

  @IsIn(VALID_PLATFORMS)
  platform!: PlatformType;

  @IsIn(POST_TYPE_VALUE)
  suggestedPostType!: PostTypeValue;
}

export class GenerateContentRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  topic!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PostIdeaDto)
  ideas!: PostIdea[];

  @IsIn(['PROFESSIONAL', 'CASUAL', 'HUMOROUS', 'INSPIRATIONAL'])
  tone!: ToneStyle;
}

class PostDraft {
  @IsIn(VALID_PLATFORMS)
  platform!: PlatformType;

  @IsIn(POST_TYPE_VALUE)
  postType!: PostTypeValue;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsArray()
  @IsString({ each: true })
  hashtags!: string[];
}

export class SaveDraftPostsRequestDto {
  @IsUUID()
  campaignId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PostDraft)
  posts!: {
    platform: PlatformType;
    postType: PostTypeValue;
    content: string;
    hashtags: string[];
  }[];
}
