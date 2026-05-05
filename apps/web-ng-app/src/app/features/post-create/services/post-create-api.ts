import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreatePostRequest, Post } from '@sm-campaigns-app/datatypes';
import { environment } from '../../../../environments/environment';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PostCreateApi {
  private readonly http = inject(HttpClient);

  createPost(payload: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(`${environment.apiUrl}/posts`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Service error', error);
        return throwError(() => error);
      }),
    );
  }
}
