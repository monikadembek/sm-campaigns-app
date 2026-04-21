import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CampaignDetails } from '@sm-campaigns-app/datatypes';
import { CampaignStore } from './campaign-store';

@Injectable({
  providedIn: 'root',
})
export class CampaignApi {
  private readonly campaignStore = inject(CampaignStore);
  #id = this.campaignStore.campaignId;

  #campaignResource = httpResource<CampaignDetails>(
    () => ({
      url: `${environment.apiUrl}/campaigns/${this.#id()}`,
    }),
    { defaultValue: undefined },
  );

  campaignResource = this.#campaignResource.asReadonly();

  reloadCampaign(): void {
    this.#campaignResource.reload();
  }
}
