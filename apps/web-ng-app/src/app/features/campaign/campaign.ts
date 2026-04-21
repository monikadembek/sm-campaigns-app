import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Resource,
  Signal,
} from '@angular/core';
import { CampaignStore } from './services/campaign-store';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampaignApi } from './services/campaign-api';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';

@Component({
  selector: 'app-campaign',
  imports: [MessageModule, ButtonModule, RouterLink, TagModule, PanelModule],
  templateUrl: './campaign.html',
  styleUrl: './campaign.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Campaign {
  private readonly campaignStore = inject(CampaignStore);
  private readonly campaignApiService = inject(CampaignApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  campaignId: Signal<string> = this.campaignStore.campaignId;
  campaignDetails!: Resource<CampaignDetails | undefined>;

  constructor() {
    this.route.params.subscribe((params) =>
      this.campaignStore.setCampaignId(params['id']),
    );
    effect(() => {
      this.campaignDetails = this.campaignApiService.campaignResource;

      const error = this.campaignApiService.campaignResource.error() as
        | HttpErrorResponse
        | undefined;

      if (error && (error.status === 404 || error.status === 400)) {
        console.log('err', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Campaign with given id was not found',
        });
        this.router.navigate(['/campaigns']);
      }

      console.log('campaign details: ', this.campaignDetails.value());
      console.log('error: ', this.campaignDetails.error());
      console.log('status: ', this.campaignDetails.error()?.message);
    });
  }

  editCampaign() {
    console.log('edit campaign');
  }

  deleteCampaign() {
    console.log('delete campaign');
  }

  addPost() {
    console.log('add post');
  }

  editPost() {
    console.log('edit post');
  }

  schedulePost() {
    console.log('schedule post');
  }
}
