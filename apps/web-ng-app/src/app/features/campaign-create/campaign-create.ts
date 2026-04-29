import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { CampaignCreateForm } from './components/campaign-create-form/campaign-create-form';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { CampaignCreateApi } from './services/campaign-create-api';
import { CreateCampaignRequest } from '@sm-campaigns-app/datatypes';
import { handleHttpErrorResponseMessage } from '../../core/utils/errors-utils';
import { CampaignGoalsApi } from '../../shared/services/campaign-goals-api';
import { CanDeactivateComponent } from '../../shared/guards/campaign-form-can-deactivate-guard';
import { Observable, Subject } from 'rxjs';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-campaign-create',
  imports: [CampaignCreateForm, ConfirmDialog, MessageModule],
  templateUrl: './campaign-create.html',
  styleUrl: './campaign-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignCreate implements CanDeactivateComponent {
  private readonly createCampaignApiService = inject(CampaignCreateApi);
  private readonly campaignGoalsApiService = inject(CampaignGoalsApi);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  campaignGoals = this.campaignGoalsApiService.goals;

  createFormComponent = viewChild.required(CampaignCreateForm);
  private submitted = false;
  isFormDirty = computed(() => {
    return this.createFormComponent().campaignForm.dirty;
  });

  canDeactivate(): boolean | Observable<boolean> {
    if (this.submitted || !this.isFormDirty()) {
      return true;
    }

    const shouldClose$ = new Subject<boolean>();

    this.confirmationService.confirm({
      message: 'Do you want to discard unsaved changes and leave form?',
      header: 'Confirm',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: { label: 'Discard', severity: 'danger' },
      accept: () => {
        shouldClose$.next(true);
        shouldClose$.complete();
      },
      reject: () => {
        shouldClose$.next(false);
        shouldClose$.complete();
      },
    });

    return shouldClose$.asObservable();
  }

  cancel() {
    this.router.navigate(['/campaigns']);
  }

  saveNewCampaign(form: CreateCampaignRequest) {
    this.createCampaignApiService.createCampaign(form).subscribe({
      next: (resp) => {
        this.submitted = true;
        this.messageService.add({
          severity: 'success',
          summary: 'Confirmed',
          detail: `Campaign ${resp.name} was created`,
        });
        this.router.navigate(['/campaigns']);
      },
      error: (err) => {
        console.error('Error when creating campaign: ', err);
        const errorText = handleHttpErrorResponseMessage(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Creating new campaign failed. ${errorText}`,
        });
      },
    });
  }
}
