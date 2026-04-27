import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { TagModule } from 'primeng/tag';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-campaign-details-component',
  imports: [TagModule, DatePipe],
  templateUrl: './campaign-details.html',
  styleUrl: './campaign-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignDetailsComponent {
  campaignData = input.required<CampaignDetails | undefined>();
}
