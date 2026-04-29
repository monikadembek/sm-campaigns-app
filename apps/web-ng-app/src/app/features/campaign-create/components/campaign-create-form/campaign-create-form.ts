import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CampaignGoal,
  CampaignStatus,
  CreateCampaignRequest,
} from '@sm-campaigns-app/datatypes';
import { endDateValidator } from '../../../campaign/components/campaign-edit/end-date-validator.directive';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-campaign-create-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './campaign-create-form.html',
  styleUrl: './campaign-create-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignCreateForm {
  readonly fb = inject(FormBuilder);

  goals = input.required<CampaignGoal[]>();
  cancelEdit = output<boolean>();
  saveForm = output<CreateCampaignRequest>();

  campaignGoalSelectOptions = computed(() =>
    this.goals().map((item) => ({ label: item.label, value: item.id })),
  );

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
      goalId: this.fb.control<number | null>(null, [Validators.required]),
      audience: this.fb.control<string | null>(null, [
        Validators.maxLength(255),
      ]),
      startDate: this.fb.control<Date | null>(null),
      endDate: this.fb.control<Date | null>(null),
      status: this.fb.nonNullable.control<CampaignStatus>('DRAFT', [
        Validators.required,
        Validators.maxLength(1000),
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

  get audience() {
    return this.campaignForm.get('audience');
  }

  saveNewCampaign() {
    if (this.campaignForm.valid) {
      this.saveForm.emit(this.campaignForm.value as CreateCampaignRequest);
    }
  }

  cancel() {
    this.cancelEdit.emit(this.campaignForm.dirty);
  }
}
