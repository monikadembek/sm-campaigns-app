import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  Signal,
} from '@angular/core';
import { CampaignStore } from './services/campaign-store';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampaignApi } from './services/campaign-api';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { handleHttpErrorResponseMessage } from '../../core/utils/errors-utils';
import { CampaignDetailsComponent } from './components/campaign-details/campaign-details';
import { CampaignEdit } from './components/campaign-edit/campaign-edit';
import { CampaignForm } from './campaign.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CampaignGoalsApi } from '../../shared/services/campaign-goals-api';

@Component({
  selector: 'app-campaign',
  imports: [
    MessageModule,
    ButtonModule,
    RouterLink,
    TagModule,
    PanelModule,
    ConfirmDialogModule,
    CampaignDetailsComponent,
    CampaignEdit,
  ],
  templateUrl: './campaign.html',
  styleUrl: './campaign.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Campaign {
  private readonly campaignStore = inject(CampaignStore);
  private readonly campaignApiService = inject(CampaignApi);
  private readonly campaignGoalsApiService = inject(CampaignGoalsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  campaignId: Signal<string> = this.campaignStore.campaignId;
  campaignDetails = this.campaignApiService.campaignResource;
  campaignGoals = this.campaignGoalsApiService.goals;

  #mode = signal<'edit' | 'read'>('read');
  mode = this.#mode.asReadonly();

  constructor() {
    this.route.params
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.campaignStore.setCampaignId(params['id']));

    effect(() => {
      const error = this.campaignDetails.error() as
        | HttpErrorResponse
        | undefined;

      if (error && (error.status === 404 || error.status === 400)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Campaign with given id was not found',
        });
        this.router.navigate(['/campaigns']);
      }
    });
  }

  setMode(mode: 'edit' | 'read') {
    this.#mode.set(mode);
  }

  editCampaign() {
    this.setMode('edit');
  }

  confirmDelete(event: Event) {
    console.log(event);
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Do you want to delete this campaign?',
      header: 'Confirm',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },

      accept: () => {
        this.deleteCampaign(
          this.campaignId(),
          this.campaignDetails.value()?.name as string,
        );
      },
    });
  }

  deleteCampaign(id: string, campaignName: string) {
    this.campaignApiService.deleteCampaign(id).subscribe({
      next: (res) => {
        console.log(res);
        this.messageService.add({
          severity: 'success',
          summary: 'Confirmed',
          detail: `Campaign ${campaignName} was deleted`,
        });
        this.router.navigate(['/campaigns']);
      },
      error: (err) => {
        console.error('Error when deleting campaign: ', err);
        const errorText = handleHttpErrorResponseMessage(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Deleting campaign ${campaignName} failed. ${errorText}`,
        });
      },
    });
  }

  saveCampaignForm(formValues: CampaignForm) {
    this.setMode('read');
    this.campaignApiService
      .saveEditedCampaign(this.campaignId(), formValues)
      .subscribe({
        next: (res) => {
          console.log(res);
          this.messageService.add({
            severity: 'info',
            summary: 'Saved',
            detail: `Campaign ${this.campaignDetails.value()?.name} was updated`,
          });
          this.campaignApiService.reloadCampaign();
        },
        error: (err) => {
          console.error('Error when updating campaign: ', err);
          const errorText = handleHttpErrorResponseMessage(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Updating campaign ${this.campaignDetails.value()?.name} failed. ${errorText}`,
          });
        },
      });
  }

  // TODO: for future development
  editPost() {
    console.log('edit post');
  }

  schedulePost() {
    console.log('schedule post');
  }
}
