import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CampaignDetails, CampaignGoal } from '@sm-campaigns-app/datatypes';
import { CampaignStore } from './campaign-store';
import { catchError, Observable, throwError } from 'rxjs';
import { CampaignForm } from '../campaign.model';

@Injectable({
  providedIn: 'root',
})
export class CampaignApi {
  private readonly campaignStore = inject(CampaignStore);
  private readonly http = inject(HttpClient);

  #id = this.campaignStore.campaignId;

  #campaignResource = httpResource<CampaignDetails>(
    () => ({
      url: `${environment.apiUrl}/campaigns/${this.#id()}`,
    }),
    { defaultValue: undefined },
  );

  campaignResource = this.#campaignResource.asReadonly();

  #goals = httpResource<CampaignGoal[]>(
    () => ({
      url: `${environment.apiUrl}/campaign-goals`,
    }),
    {
      defaultValue: [],
    },
  );

  goals = this.#goals.asReadonly();

  reloadCampaign(): void {
    this.#campaignResource.reload();
  }

  deleteCampaign(id: string): Observable<string> {
    return this.http
      .delete<string>(`${environment.apiUrl}/campaigns/${id}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Service error', error);
          return throwError(() => error);
        }),
      );
  }

  saveEditedCampaign(
    id: string,
    formValues: CampaignForm,
  ): Observable<CampaignDetails> {
    return this.http
      .patch<CampaignDetails>(
        `${environment.apiUrl}/campaigns/${id}`,
        formValues,
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Service error', error);
          return throwError(() => error);
        }),
      );
  }
}
