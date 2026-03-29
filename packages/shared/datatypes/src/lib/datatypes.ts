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
export type CreateCampaignRequest = { name: string; goalId: number };
