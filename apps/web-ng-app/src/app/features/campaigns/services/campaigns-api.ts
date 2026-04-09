import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Campaign } from '@sm-campaigns-app/datatypes';

@Injectable({
  providedIn: 'root',
})
export class CampaignsApi {
  #campaignsFullData = httpResource<Campaign[]>(
    () => ({
      url: `${environment.apiUrl}/campaigns/full`,
    }),
    {
      defaultValue: [],
    },
  );

  campaignsFullData = this.#campaignsFullData.asReadonly();

  reloadCampaigns() {
    return this.#campaignsFullData.reload();
  }
}
