export type User = {
  id: string;
  supabaseId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ToneStyle =
  | 'PROFESSIONAL'
  | 'CASUAL'
  | 'HUMOROUS'
  | 'INSPIRATIONAL';

// Re-export platform/post type as string unions (mirrors Prisma enums)
export type PlatformType =
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'FACEBOOK'
  | 'LINKEDIN'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'PINTEREST';
export type PostTypeValue =
  | 'IMAGE'
  | 'VIDEO'
  | 'CAROUSEL'
  | 'REEL'
  | 'STORY'
  | 'TEXT'
  | 'LINK'
  | 'POLL';

// Step 1 → 2: Idea generation
export type GenerateIdeasRequest = {
  topic: string;
  platforms: PlatformType[];
  tone: ToneStyle;
  numberOfIdeas: number;
  additionalContext?: string;
};

export type PostIdea = {
  id: string;
  title: string;
  summary: string;
  platform: PlatformType;
  suggestedPostType: PostTypeValue;
};

export type GenerateIdeasResponse = { ideas: PostIdea[] };

// Regenerate single idea
export type RegenerateIdeaRequest = {
  originalIdea: PostIdea;
  feedback?: string;
  topic: string;
  tone: ToneStyle;
};

export type RegenerateIdeaResponse = { idea: PostIdea };

// Step 2 → 3: Content generation
export type GenerateContentRequest = {
  ideas: PostIdea[];
  tone: ToneStyle;
  topic: string;
};

export type GeneratedPostContent = {
  ideaId: string;
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags: string[];
};

export type GenerateContentResponse = { posts: GeneratedPostContent[] };

// Regenerate single post content
export type RegenerateContentRequest = {
  post: GeneratedPostContent;
  feedback?: string;
  tone: ToneStyle;
  topic: string;
};

export type RegenerateContentResponse = { post: GeneratedPostContent };

// Save drafts
export type SaveDraftPostsRequest = {
  campaignId: string;
  posts: {
    platform: PlatformType;
    postType: PostTypeValue;
    content: string;
    hashtags: string[];
  }[];
};

export type SaveDraftPostsResponse = { savedCount: number; postIds: string[] };

// Campaign helpers
export type CampaignSummary = { id: string; name: string; status: string };
export type CreateCampaignRequest = {
  name: string;
  goalId: number;
  audience?: string;
  status?: CampaignStatus;
  notes?: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type CampaignGoal = {
  id: number;
  slug: string;
  label: string;
  sortOrder: number;
};

export type CampaignStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type PostLimitedData = {
  id: string;
  platform: PlatformType;
  postType: PostTypeValue;
};

type CampaignBase = {
  id: string;
  userId: string;
  goalId: number;
  name: string;
  audience: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  timezone: string;
  status: CampaignStatus;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  goal: CampaignGoal;
};

export type Campaign = CampaignBase & { posts: PostLimitedData[] };

export type CampaignDetails = CampaignBase & { posts: Post[] };

export type Post = {
  id: string;
  campaignId: string;
  ctaId: string | null;
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags: string[];
  publishDate: Date | string | null;
  scheduledAt: Date | string | null;
  publishedAt: Date | string | null;
  status: PostStatus;
  errorLog: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  postMedia: PostMedia[];
};

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export type PostMedia = {
  postId: string;
  mediaId: string;
  sortOrder: number;
  media: Media;
};

export type Media = {
  id: string;
  userId: string;
  storageKey: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSecs: number | null;
  altText: string | null;
  createdAt: Date;
};

export type MediaType = 'IMAGE' | 'VIDEO' | 'GIF' | 'DOCUMENT';
