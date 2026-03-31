import { ToneStyle, PlatformType } from '@sm-campaigns-app/datatypes';

export interface FirstStepForm {
  topic: string;
  selectedPlatform: PlatformType[];
  selectedTone: ToneStyle;
  numberOfIdeas: number;
  additionalContext: string | null;
}
