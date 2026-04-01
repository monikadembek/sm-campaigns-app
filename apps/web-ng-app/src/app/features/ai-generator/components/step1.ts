import { Component, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import {
  FormField,
  FormRoot,
  form,
  max,
  maxLength,
  min,
  minLength,
  required,
  validate,
  submit,
} from '@angular/forms/signals';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { FirstStepForm } from '../models/ai-generator.models';
import { AiGeneratorApi } from '../services/ai-generator-api';
import { PlatformType, ToneStyle } from '@sm-campaigns-app/datatypes';
import { MessageModule } from 'primeng/message';
import { handleHttpErrorResponseMessage } from '../../../core/utils/errors-utils';

@Component({
  selector: 'app-step1',
  imports: [
    FormRoot,
    StepperModule,
    ButtonModule,
    FormField,
    InputTextModule,
    CheckboxModule,
    RadioButtonModule,
    TextareaModule,
    MessageModule,
  ],
  templateUrl: './step1.html',
  styleUrl: './step1.css',
})
export class Step1 {
  readonly activateCallback = input<(step: number) => void>();

  private readonly aiGeneratorApiService = inject(AiGeneratorApi);

  readonly errorMessage = signal<string | null>(null);

  readonly firstStepModel = signal<FirstStepForm>({
    topic:
      'Ideas for posts about newly opened etsy shop callet Tshirts Club selling tshirts with unique custom designs',
    selectedPlatform: ['FACEBOOK'],
    selectedTone: 'CASUAL',
    numberOfIdeas: 1,
    additionalContext: null,
  });

  readonly tones: ToneStyle[] = [
    'PROFESSIONAL',
    'CASUAL',
    'HUMOROUS',
    'INSPIRATIONAL',
  ];
  readonly platforms: PlatformType[] = [
    'INSTAGRAM',
    'TWITTER',
    'FACEBOOK',
    'LINKEDIN',
    'TIKTOK',
    'YOUTUBE',
    'PINTEREST',
  ];

  firstStepForm = form(this.firstStepModel, (path) => {
    required(path.topic, {
      message: 'Topic is required',
    });
    minLength(path.topic, 10, {
      message: 'Topic should contain of at least 10 characters',
    });
    maxLength(path.topic, 2000, {
      message:
        'Your topic is too long, you exceeded max number of 2000 characters',
    });
    required(path.selectedTone, {
      message: 'Tone style is required',
    });
    required(path.numberOfIdeas, {
      message: 'Number of ideas is required',
    });
    min(path.numberOfIdeas, 1, {
      message: 'Minimum number of ideas is 1',
    });
    max(path.numberOfIdeas, 100, {
      message: 'Maximum number of ideas is 100',
    });
    validate(path.selectedPlatform, (ctx) => {
      const value = ctx.value();
      if (value?.length === 0) {
        return {
          kind: 'selected-platform-none',
          message: 'Selecting at least one platform is required',
        };
      }
      return undefined;
    });
    validate(path.additionalContext, (ctx) => {
      const value = ctx.value();
      if (value?.length && value.length > 2000) {
        return {
          kind: 'additional-context-too-long',
          message:
            'Your additional content is too long, you exceeded max number of 2000 characters',
        };
      }
      return undefined;
    });
  });

  async handleFirstStep() {
    await submit(this.firstStepForm, {
      action: async () => {
        console.log('step1 action fn', this.firstStepForm().value());
        this.errorMessage.set(null);
        this.aiGeneratorApiService
          .generateIdeas(this.firstStepModel())
          .subscribe({
            next: (res) => {
              console.log('ideas generated: ', res);
              this.activateCallback()?.(2);
            },
            error: (err) => {
              console.error('Component error: error generating ideas', err);
              const errorText = handleHttpErrorResponseMessage(err);
              this.errorMessage.set(
                `${errorText} Generating post ideas failed. Please try again later`,
              );
            },
          });
      },
    });
  }
}
