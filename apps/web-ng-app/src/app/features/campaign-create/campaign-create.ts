import { Component, inject } from '@angular/core';
import { CampaignCreateForm } from './components/campaign-create-form/campaign-create-form';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { CampaignCreateApi } from './services/campaign-create-api';
import { CreateCampaignRequest } from '@sm-campaigns-app/datatypes';
import { handleHttpErrorResponseMessage } from '../../core/utils/errors-utils';
import { CampaignGoalsApi } from '../../shared/services/campaign-goals-api';

@Component({
  selector: 'app-campaign-create',
  imports: [CampaignCreateForm, ConfirmDialog],
  templateUrl: './campaign-create.html',
  styleUrl: './campaign-create.css',
})
export class CampaignCreate {
  private readonly createCampaignApiService = inject(CampaignCreateApi);
  private readonly campaignGoalsApiService = inject(CampaignGoalsApi);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  campaignGoals = this.campaignGoalsApiService.goals;

  cancel(isFormDirty: boolean) {
    if (isFormDirty) {
      this.confirmationService.confirm({
        // target: event.target as EventTarget,
        message: 'Do you want to discard unsaved changes and leave form?',
        header: 'Confirm',
        icon: 'pi pi-info-circle',
        rejectLabel: 'Cancel',
        rejectButtonProps: {
          label: 'Cancel',
          severity: 'secondary',
          outlined: true,
        },
        acceptButtonProps: {
          label: 'Discard',
          severity: 'danger',
        },

        accept: () => {
          this.router.navigate(['/campaigns']);
        },
      });
    } else {
      this.router.navigate(['/campaigns']);
    }
  }

  saveNewCampaign(form: CreateCampaignRequest) {
    console.log('form create campaign', form);
    this.createCampaignApiService.createCampaign(form).subscribe({
      next: (resp) => {
        console.log('resp new campaign added', resp);
        this.messageService.add({
          severity: 'success',
          summary: 'Confirmed',
          detail: `New campaign was created`,
        });
        this.router.navigate(['/campaigns']);
      },
      error: (err) => {
        console.error('Error when deleting campaign: ', err);
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
