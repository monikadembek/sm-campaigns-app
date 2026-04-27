import { httpResource } from '@angular/common/http';
import { Component, effect, inject, input, output } from '@angular/core';
import {
  CampaignDetails,
  CampaignGoal,
  CampaignStatus,
} from '@sm-campaigns-app/datatypes';
import { environment } from '../../../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { endDateValidator } from './end-date-validator.directive';
import { CampaignForm } from '../../campaign.model';

@Component({
  selector: 'app-campaign-edit',
  imports: [
    TagModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './campaign-edit.html',
  styleUrl: './campaign-edit.css',
})
export class CampaignEdit {
  readonly fb = inject(FormBuilder);

  campaignData = input.required<CampaignDetails | undefined>();
  cancelEdit = output<void>();
  saveEditedForm = output<CampaignForm>();

  goals = httpResource<CampaignGoal[]>(
    () => ({
      url: `${environment.apiUrl}/campaign-goals`,
    }),
    {
      defaultValue: [],
    },
  );

  campaignGoalSelectOptions: { label: string; value: number }[] = [];

  campaignStatusSelectOptions: { label: string; value: CampaignStatus }[] = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Paused', value: 'PAUSED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  campaignForm = this.fb.nonNullable.group(
    {
      name: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(255),
      ]),
      goalId: this.fb.control(0, [Validators.required]),
      audience: this.fb.control<string | null>(null),
      startDate: this.fb.control<Date | null>(null),
      endDate: this.fb.control<Date | null>(null),
      status: this.fb.nonNullable.control<CampaignStatus>('DRAFT', [
        Validators.required,
      ]),
      notes: this.fb.control<string | null>('', [Validators.maxLength(255)]),
    },
    {
      validators: endDateValidator,
    },
  );

  get name() {
    return this.campaignForm.get('name');
  }

  get notes() {
    return this.campaignForm.get('notes');
  }

  get endDate() {
    return this.campaignForm.get('endDate');
  }

  private prepareCampaignGoalsSelect(
    goals: CampaignGoal[],
  ): { label: string; value: number }[] {
    return goals.map((item) => {
      return {
        label: item.label,
        value: item.id,
      };
    });
  }

  constructor() {
    effect(() => {
      this.campaignGoalSelectOptions = this.prepareCampaignGoalsSelect(
        this.goals.value(),
      );
      this.setFormValues();
    });
  }

  setFormValues(): void {
    const campaign = this.campaignData();
    if (!campaign) return;
    console.log('set form values', campaign);
    this.campaignForm.setValue({
      name: campaign.name ?? '',
      goalId: campaign.goalId,
      audience: campaign.audience ?? '',
      startDate: campaign.startDate ? new Date(campaign.startDate) : null,
      endDate: campaign.endDate ? new Date(campaign.endDate) : null,
      status: campaign.status ?? '',
      notes: campaign.notes ?? '',
    });
  }

  saveCampaignChanges() {
    if (this.campaignForm.valid) {
      this.saveEditedForm.emit(this.campaignForm.value as CampaignForm);
    }
  }

  cancel() {
    this.cancelEdit.emit();
  }
}
