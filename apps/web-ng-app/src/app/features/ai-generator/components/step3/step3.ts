import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import {
  FormField,
  FormRoot,
  form,
  validate,
  submit,
  required,
  minLength,
  maxLength,
} from '@angular/forms/signals';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { ThirdStepForm } from '../../models/ai-generator.models';
import { AiGeneratorApi } from '../../services/ai-generator-api';
import { MessageModule } from 'primeng/message';
import { handleHttpErrorResponseMessage } from '../../../../core/utils/errors-utils';
import { AiGeneratorStore } from '../../services/ai-generator-store';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { CampaignGoal, CampaignSummary } from '@sm-campaigns-app/datatypes';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-step3',
  imports: [
    FormRoot,
    StepperModule,
    ButtonModule,
    FormField,
    InputTextModule,
    SelectButtonModule,
    CheckboxModule,
    RadioButtonModule,
    TextareaModule,
    MessageModule,
    SelectModule,
    FormsModule,
  ],
  providers: [MessageService],
  templateUrl: './step3.html',
  styleUrl: './step3.css',
})
export class Step3 {
  readonly activateCallback = input<(step: number) => void>();

  private readonly aiGeneratorApiService = inject(AiGeneratorApi);
  private readonly aiGeneratorStore = inject(AiGeneratorStore);
  private messageService = inject(MessageService);

  readonly errorMessage = signal<string | null>(null);

  readonly generatedPostsContent = this.aiGeneratorStore.generatedPostsContent;

  campaignToggleSelectValue = signal('new');
  campaignToggleSelectOptions: { label: string; value: string }[] = [
    {
      label: 'Create new campaign',
      value: 'new',
    },
    {
      label: 'Select existing campaign',
      value: 'existing',
    },
  ];

  goals: CampaignGoal[] = [];
  campaignGoalSelectOptions: { label: string; value: string }[] = [];
  selectedGoalId = '1';

  campaignsResourceValue = signal<CampaignSummary[]>(
    this.aiGeneratorApiService.getCampaigns().value() ?? [],
  );
  campaigns = computed(() => {
    if (
      this.campaignsResourceValue() &&
      this.campaignsResourceValue().length > 0
    ) {
      return this.campaignsResourceValue();
    } else {
      return [];
    }
  });
  selectedCampaignId = '';

  readonly campaignModel = signal({
    campaignName: '',
    goalId: 1,
  });

  readonly campaignForm = form(this.campaignModel, (path) => {
    required(path.campaignName, {
      message: 'Campaign name is required',
    });
    minLength(path.campaignName, 2, {
      message: 'Campaign name must have at least 2 characters',
    });
    maxLength(path.campaignName, 255, {
      message: "Campaign name can't be longer than 255 characters",
    });
    required(path.goalId, {
      message: 'Campaign goal is required',
    });
  });

  readonly thirdStepModel = signal<ThirdStepForm>({
    campaignId: '',
    posts: [],
  });

  readonly thirdStepForm = form(this.thirdStepModel, (path) => {
    validate(path.posts, (ctx) => {
      const value = ctx.value();
      if (value?.length === 0) {
        return {
          kind: 'selected-posts-none',
          message: 'Selecting at least one post content is required',
        };
      }
      return undefined;
    });
    required(path.campaignId, {
      message: 'Campaign must be selected',
    });
    minLength(path.campaignId, 1, {
      message: 'Campaign must be selected',
    });
  });

  constructor() {
    this.goals = this.getGoals();
    this.campaignGoalSelectOptions = this.prepareCampaignGoalsSelect(
      this.goals,
    );

    effect(() => {
      this.campaignsResourceValue.set(
        this.aiGeneratorApiService.getCampaigns().value(),
      );
      if (
        this.campaignsResourceValue() &&
        this.campaignsResourceValue().length > 0
      ) {
        this.selectedCampaignId = this.campaigns()[0].id;
      }
      console.log('campaigns list: ', this.campaigns());
    });
  }

  private getGoals(): CampaignGoal[] {
    // TODO: fetch campaignGoals from server when api is ready
    return [
      {
        id: 1,
        slug: 'build_brand_awareness',
        label: 'Build Brand Awareness',
        sortOrder: 1,
      },
      { id: 2, slug: 'drive_sales', label: 'Drive Sales', sortOrder: 2 },
      {
        id: 3,
        slug: 'lead_generation',
        label: 'Lead Generation',
        sortOrder: 3,
      },
      {
        id: 4,
        slug: 'announce_new_product',
        label: 'Announce New Product',
        sortOrder: 4,
      },
      {
        id: 5,
        slug: 'increase_engagement',
        label: 'Increase Engagement',
        sortOrder: 5,
      },
      {
        id: 6,
        slug: 'increase_traffic',
        label: 'Increase Traffic',
        sortOrder: 6,
      },
      { id: 7, slug: 'conversions', label: 'Conversions', sortOrder: 7 },
      { id: 8, slug: 'promote_event', label: 'Promote An Event', sortOrder: 8 },
    ];
  }

  prepareCampaignGoalsSelect(
    goals: CampaignGoal[],
  ): { label: string; value: string }[] {
    return goals.map((item) => {
      return {
        label: item.label,
        value: `${item.id}`,
      };
    });
  }

  campaingSelectToggleChange(value: string) {
    this.campaignToggleSelectValue.set(value);
  }

  createCampaign() {
    this.aiGeneratorApiService
      .createCampaign(this.campaignModel().campaignName, +this.selectedGoalId)
      .subscribe({
        next: (res: CampaignSummary) => {
          console.log('new campaign created: ', res);
          this.errorMessage.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Success Message',
            detail: 'New campaign was created',
            life: 3000,
          });
          this.thirdStepModel.set({
            ...this.thirdStepModel(),
            campaignId: res.id,
          });
          this.aiGeneratorApiService.reloadCampaigns();
          this.campaignToggleSelectValue.set('existing');
        },
        error: (err) => {
          console.error('Component error: error creating new campaign', err);
          const errorText = handleHttpErrorResponseMessage(err);
          this.errorMessage.set(
            `${errorText} Creating campaign failed. Please try again later`,
          );
        },
      });
  }

  async saveDrafts() {
    await submit(this.thirdStepForm, {
      action: async () => {
        console.log('second step form', this.thirdStepModel());
        this.errorMessage.set(null);
        this.aiGeneratorApiService
          .saveDraftPosts(this.selectedCampaignId, this.thirdStepModel().posts)
          .subscribe({
            next: (res) => {
              console.log('post content saved as drafts: ', res);
              this.messageService.add({
                severity: 'success',
                summary: 'Success Message',
                detail: 'Selected posts have been saved in database',
                life: 3000,
              });
            },
            error: (err) => {
              console.error('Component error: error saving post drafts', err);
              const errorText = handleHttpErrorResponseMessage(err);
              this.errorMessage.set(
                `${errorText} Saving posts drafts failed. Please try again later`,
              );
            },
          });
      },
    });
  }

  handlePreviousStep() {
    this.activateCallback()?.(2);
  }
}
