import {
  ToneStyle,
  PlatformType,
  PostIdea,
  PostTypeValue,
} from '@sm-campaigns-app/datatypes';

export interface FirstStepForm {
  topic: string;
  selectedPlatform: PlatformType[];
  selectedTone: ToneStyle;
  numberOfIdeas: number;
  additionalContext: string | null;
}

export interface SecondStepForm {
  postIdeas: PostIdea[];
}

export interface PostDraft {
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags: string[];
}

export interface ThirdStepForm {
  campaignId: string;
  posts: PostDraft[];
}
