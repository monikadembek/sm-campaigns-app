import { Route } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { guestGuard } from './core/auth/guards/guest-guard';

export const appRoutes: Route[] = [
  {
    path: 'ai-content-generator',
    loadComponent: () =>
      import('./features/ai-generator/ai-generator').then((m) => m.AiGenerator),
    canActivate: [authGuard],
  },
  {
    path: 'campaigns',
    loadComponent: () =>
      import('./features/campaigns/campaigns').then((m) => m.Campaigns),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./core/auth/pages/verify/verify').then((m) => m.Verify),
    canActivate: [guestGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
