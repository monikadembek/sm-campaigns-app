import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs';
import { SkipLoadingToken } from './skip-loading-token';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SkipLoadingToken)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.loadingOn();

  return next(req).pipe(
    finalize(() => {
      loadingService.loadingOff();
    }),
  );
};
