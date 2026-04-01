import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FirstStepForm } from '../models/ai-generator.models';
import { catchError, Observable, retry, throwError } from 'rxjs';
import { GenerateIdeasResponse } from '@sm-campaigns-app/datatypes';

@Injectable({
  providedIn: 'root',
})
export class AiGeneratorApi {
  private readonly http = inject(HttpClient);

  #campaigns = httpResource<unknown>(
    () => ({
      url: `${environment.apiUrl}/campaigns`,
    }),
    { defaultValue: [] },
  );

  getCampaigns() {
    return this.#campaigns.asReadonly();
  }

  createCampaign(name: string, goalId: number) {
    return this.http
      .post<unknown>(`${environment.apiUrl}/campaigns`, {
        name,
        goalId,
      })
      .pipe(
        retry(2),
        catchError((error: HttpErrorResponse) => {
          console.error('Service error', error);
          return throwError(() => error);
        }),
      );
  }

  generateIdeas(
    data: FirstStepForm,
  ): Observable<{ success: boolean; data: GenerateIdeasResponse }> {
    return this.http
      .post<{ success: boolean; data: GenerateIdeasResponse }>(
        `${environment.apiUrl}/ai-content/generate-idea`,
        {
          topic: data.topic,
          platforms: data.selectedPlatform,
          tone: data.selectedTone,
          numberOfIdeas: data.numberOfIdeas,
          additionalContext: data.additionalContext,
        },
      )
      .pipe(
        retry(2),
        catchError((error: HttpErrorResponse) => {
          console.error('Service error', error);
          return throwError(() => error);
        }),
      );
  }
}
