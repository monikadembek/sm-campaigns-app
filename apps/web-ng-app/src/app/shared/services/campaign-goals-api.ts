import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CampaignGoal } from '@sm-campaigns-app/datatypes';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CampaignGoalsApi {
  #goals = httpResource<CampaignGoal[]>(
    () => ({
      url: `${environment.apiUrl}/campaign-goals`,
    }),
    {
      defaultValue: [],
    },
  );

  goals = this.#goals.asReadonly();
}
