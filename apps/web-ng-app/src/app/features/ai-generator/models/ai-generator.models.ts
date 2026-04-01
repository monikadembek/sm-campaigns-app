import { ToneStyle, PlatformType, PostIdea } from '@sm-campaigns-app/datatypes';

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
