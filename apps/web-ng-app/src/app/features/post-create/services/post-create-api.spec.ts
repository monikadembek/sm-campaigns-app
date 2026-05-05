import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CreatePostRequest, Post } from '@sm-campaigns-app/datatypes';
import { PostCreateApi } from './post-create-api';
import { environment } from '../../../../environments/environment';

const mockCreatePostRequest: CreatePostRequest = {
  campaignId: 'c1',
  platform: 'INSTAGRAM',
  postType: 'IMAGE',
  content: 'Hello world',
  hashtags: ['#hello'],
  publishDate: null,
  scheduledAt: null,
  status: 'DRAFT',
};

const mockPost: Post = {
  id: 'p1',
  campaignId: 'c1',
  ctaId: null,
  platform: 'INSTAGRAM',
  postType: 'IMAGE',
  content: 'Hello world',
  hashtags: ['#hello'],
  publishDate: null,
  scheduledAt: null,
  publishedAt: null,
  status: 'DRAFT',
  errorLog: null,
  createdAt: '2026-05-05T00:00:00Z',
  updatedAt: '2026-05-05T00:00:00Z',
  postMedia: [],
};

describe('PostCreateApi', () => {
  let service: PostCreateApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PostCreateApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createPost', () => {
    it('should POST to /posts and return the created post', () => {
      let response: Post | undefined;
      service.createPost(mockCreatePostRequest).subscribe((res) => (response = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/posts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCreatePostRequest);
      req.flush(mockPost);

      expect(response).toEqual(mockPost);
    });

    it('should propagate HttpErrorResponse on 400 failure', () => {
      let caughtError: HttpErrorResponse | undefined;
      service.createPost(mockCreatePostRequest).subscribe({
        error: (err: HttpErrorResponse) => (caughtError = err),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/posts`);
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(400);
    });

    it('should propagate HttpErrorResponse on 500 failure', () => {
      let caughtError: HttpErrorResponse | undefined;
      service.createPost(mockCreatePostRequest).subscribe({
        error: (err: HttpErrorResponse) => (caughtError = err),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/posts`);
      req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });

      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect(caughtError?.status).toBe(500);
    });
  });
});
