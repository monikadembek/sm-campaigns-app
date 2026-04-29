import type { PlatformType, PostTypeValue, PostStatus } from '@sm-campaigns-app/datatypes';

export const POST_PLATFORM_TYPES: PlatformType[] = [
  'INSTAGRAM',
  'TWITTER',
  'FACEBOOK',
  'LINKEDIN',
  'TIKTOK',
  'YOUTUBE',
  'PINTEREST',
];

export const POST_TYPE_VALUES: PostTypeValue[] = [
  'IMAGE',
  'VIDEO',
  'CAROUSEL',
  'REEL',
  'STORY',
  'TEXT',
  'LINK',
  'POLL',
];

export const POST_STATUS_VALUES: PostStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED',
];
