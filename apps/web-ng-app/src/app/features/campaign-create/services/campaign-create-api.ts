import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CampaignDetails,
  CreateCampaignRequest,
} from '@sm-campaigns-app/datatypes';
import { environment } from '../../../../environments/environment';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CampaignCreateApi {
  private http = inject(HttpClient);

  createCampaign(payload: CreateCampaignRequest): Observable<CampaignDetails> {
    return this.http
      .post<CampaignDetails>(`${environment.apiUrl}/campaigns`, payload)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Service error', error);
          return throwError(() => error);
        }),
      );
  }
}
