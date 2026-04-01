import { Component, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import {
  FormField,
  FormRoot,
  form,
  validate,
  submit,
} from '@angular/forms/signals';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { SecondStepForm } from '../../models/ai-generator.models';
import { AiGeneratorApi } from '../../services/ai-generator-api';
import { MessageModule } from 'primeng/message';
import { handleHttpErrorResponseMessage } from '../../../../core/utils/errors-utils';
import { AiGeneratorStore } from '../../services/ai-generator-store';

@Component({
  selector: 'app-step2',
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
  templateUrl: './step2.html',
  styleUrl: './step2.css',
})
export class Step2 {
  readonly activateCallback = input<(step: number) => void>();

  private readonly aiGeneratorApiService = inject(AiGeneratorApi);
  private readonly aiGeneratorStore = inject(AiGeneratorStore);

  readonly errorMessage = signal<string | null>(null);

  readonly generatedIdeas = this.aiGeneratorStore.ideas;

  readonly secondStepModel = signal<SecondStepForm>({
    postIdeas: [],
  });

  readonly secondStepForm = form(this.secondStepModel, (path) => {
    validate(path.postIdeas, (ctx) => {
      const value = ctx.value();
      if (value?.length === 0) {
        return {
          kind: 'selected-post-ideas-none',
          message: 'Selecting at least one idea for a post is required',
        };
      }
      return undefined;
    });
  });

  async handleNextStep() {
    await submit(this.secondStepForm, {
      action: async () => {
        console.log('second step form', this.secondStepModel());
        this.errorMessage.set(null);
        this.aiGeneratorApiService
          .generateContent(
            this.secondStepModel().postIdeas,
            this.aiGeneratorStore.tone(),
            this.aiGeneratorStore.topic(),
          )
          .subscribe({
            next: (res) => {
              console.log('post content generated: ', res);
              this.aiGeneratorStore.setGeneratedPostsContent(res.data.posts);
              this.activateCallback()?.(3);
            },
            error: (err) => {
              console.error(
                'Component error: error generating post content',
                err,
              );
              const errorText = handleHttpErrorResponseMessage(err);
              this.errorMessage.set(
                `${errorText} Generating post content failed. Please try again later`,
              );
            },
          });
      },
    });
  }

  handlePreviousStep() {
    this.activateCallback()?.(1);
  }
}
