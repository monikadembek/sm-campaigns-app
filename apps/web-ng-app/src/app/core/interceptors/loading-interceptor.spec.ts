import { TestBed } from '@angular/core/testing';
import {
  HttpContext,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { of, Subject } from 'rxjs';

import { loadingInterceptor } from './loading-interceptor';
import { LoadingService } from '../services/loading.service';
import { SkipLoadingToken } from './skip-loading-token';

describe('loadingInterceptor', () => {
  let loadingService: LoadingService;

  const runInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn) =>
    TestBed.runInInjectionContext(() => loadingInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
    loadingService = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    const interceptor: HttpInterceptorFn = (req, next) =>
      TestBed.runInInjectionContext(() => loadingInterceptor(req, next));
    expect(interceptor).toBeTruthy();
  });

  it('should call loadingOn when a request starts', () => {
    const req = new HttpRequest('GET', '/api/test');
    const next: HttpHandlerFn = () => of(new HttpResponse());

    vi.spyOn(loadingService, 'loadingOn');

    runInterceptor(req, next).subscribe();

    expect(loadingService.loadingOn).toHaveBeenCalledTimes(1);
  });

  it('should call loadingOff when a request completes', () => {
    const req = new HttpRequest('GET', '/api/test');
    const next: HttpHandlerFn = () => of(new HttpResponse());

    vi.spyOn(loadingService, 'loadingOff');

    runInterceptor(req, next).subscribe();

    expect(loadingService.loadingOff).toHaveBeenCalledTimes(1);
  });

  it('should call loadingOff when a request errors', () => {
    const req = new HttpRequest('GET', '/api/test');
    const next: HttpHandlerFn = () => {
      const subject = new Subject<HttpResponse<unknown>>();
      // Emit error asynchronously so we can subscribe first
      Promise.resolve().then(() => subject.error(new Error('network error')));
      return subject.asObservable();
    };

    vi.spyOn(loadingService, 'loadingOff');

    runInterceptor(req, next).subscribe({
      error: () => {
        // expected
      },
    });

    // finalize runs synchronously on error for Subject
    // but we used Promise.resolve, so we need to wait
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(loadingService.loadingOff).toHaveBeenCalledTimes(1);
        resolve();
      });
    });
  });

  it('should skip loading when SkipLoadingToken is true', () => {
    const context = new HttpContext().set(SkipLoadingToken, true);
    const req = new HttpRequest('GET', '/api/test', { context });
    const mockResponse = new HttpResponse({ body: 'skipped' });
    const next: HttpHandlerFn = () => of(mockResponse);

    vi.spyOn(loadingService, 'loadingOn');
    vi.spyOn(loadingService, 'loadingOff');

    let response: HttpResponse<unknown> | undefined;
    runInterceptor(req, next).subscribe((res) => {
      response = res as HttpResponse<unknown>;
    });

    expect(loadingService.loadingOn).not.toHaveBeenCalled();
    expect(loadingService.loadingOff).not.toHaveBeenCalled();
    expect(response).toBe(mockResponse);
  });

  it('should not skip loading when SkipLoadingToken is false (default)', () => {
    const req = new HttpRequest('GET', '/api/test');
    const next: HttpHandlerFn = () => of(new HttpResponse());

    vi.spyOn(loadingService, 'loadingOn');

    runInterceptor(req, next).subscribe();

    expect(loadingService.loadingOn).toHaveBeenCalledTimes(1);
  });

  it('should pass the request through to the next handler', () => {
    const req = new HttpRequest('GET', '/api/test');
    const mockResponse = new HttpResponse({ body: 'data' });
    const next = vi.fn<HttpHandlerFn>(() => of(mockResponse));

    let response: HttpResponse<unknown> | undefined;
    runInterceptor(req, next).subscribe((res) => {
      response = res as HttpResponse<unknown>;
    });

    expect(next).toHaveBeenCalledWith(req);
    expect(response).toBe(mockResponse);
  });
});
