import { Route } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { guestGuard } from './core/auth/guards/guest-guard';

export const appRoutes: Route[] = [
  {
    path: 'ai-content-generator',
    loadComponent: () =>
      import('./features/ai-generator/ai-generator').then((c) => c.AiGenerator),
    canActivate: [authGuard],
  },
  {
    path: 'campaigns',
    loadComponent: () =>
      import('./features/campaigns/campaigns').then((c) => c.Campaigns),
    canActivate: [authGuard],
  },
  {
    path: 'campaigns/add',
    loadComponent: () =>
      import('./features/campaign-create/campaign-create').then(
        (c) => c.CampaignCreate,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'campaigns/:id',
    loadComponent: () =>
      import('./features/campaign/campaign').then((c) => c.Campaign),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/pages/login/login').then((c) => c.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./core/auth/pages/verify/verify').then((c) => c.Verify),
    canActivate: [guestGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((c) => c.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
