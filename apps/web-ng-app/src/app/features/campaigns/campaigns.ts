import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { CampaignsApi } from './services/campaigns-api';
import { RouterLink } from '@angular/router';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-campaigns',
  imports: [DataViewModule, CardModule, TagModule, MessageModule, RouterLink],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Campaigns {
  private readonly campaignsApi = inject(CampaignsApi);
  readonly campaignsResource = this.campaignsApi.campaignsFullData;

  constructor() {
    this.campaignsApi.reloadCampaigns();
    effect(() => {
      console.log('campaigns: ', this.campaignsResource.value());
      console.log('error', this.campaignsResource.error());
    });
  }
}
