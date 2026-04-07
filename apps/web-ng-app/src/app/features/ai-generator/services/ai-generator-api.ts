import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FirstStepForm } from '../models/ai-generator.models';
import { catchError, Observable, retry, throwError } from 'rxjs';
import {
  CampaignSummary,
  GenerateContentResponse,
  GeneratedPostContent,
  GenerateIdeasResponse,
  PostIdea,
  ToneStyle,
} from '@sm-campaigns-app/datatypes';
import { SkipLoadingToken } from '../../../core/interceptors/skip-loading-token';

@Injectable({
  providedIn: 'root',
})
export class AiGeneratorApi {
  private readonly http = inject(HttpClient);

  #campaigns = httpResource<CampaignSummary[]>(
    () => ({
      url: `${environment.apiUrl}/campaigns`,
      context: new HttpContext().set(SkipLoadingToken, true),
    }),
    { defaultValue: [] },
  );

  getCampaigns() {
    return this.#campaigns.asReadonly();
  }

  reloadCampaigns() {
    return this.#campaigns.reload();
  }

  createCampaign(name: string, goalId: number) {
    return this.http
      .post<CampaignSummary>(`${environment.apiUrl}/campaigns`, {
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
        `${environment.apiUrl}/ai-content/generate-ideas`,
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

  generateContent(
    ideas: PostIdea[],
    tone: ToneStyle,
    topic: string,
  ): Observable<{ success: boolean; data: GenerateContentResponse }> {
    return this.http
      .post<{ success: boolean; data: GenerateContentResponse }>(
        `${environment.apiUrl}/ai-content/generate-content`,
        {
          ideas,
          tone,
          topic,
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

  saveDraftPosts(campaignId: string, posts: GeneratedPostContent[]) {
    return this.http
      .post<{ success: boolean; data: GenerateContentResponse }>(
        `${environment.apiUrl}/ai-content/save-drafts`,
        {
          campaignId,
          posts: posts.map(({ ideaId, ...post }) => post),
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
