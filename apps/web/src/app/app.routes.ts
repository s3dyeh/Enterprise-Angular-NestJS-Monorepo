import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guard/auth.guard';
export const routes: Routes = [
  ...[
    { path: 'register', mode: 'register' },
    { path: 'resend-confirmation', mode: 'resend' },
    { path: 'forgot-password', mode: 'forgot' },
    { path: 'password-change', mode: 'reset' },
    { path: 'confirm-email', mode: 'confirm' },
    { path: 'confirm-new-email', mode: 'confirm-new' },
  ].map(({ path, mode }) => ({
    path,
    data: { mode },
    loadComponent: () =>
      import('./features/auth/components/account-action.component').then(
        (module) => module.AccountActionComponent,
      ),
  })),
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(
        (module) => module.LoginComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./features/home/home.routes').then((module) => module.homeRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/pages/status-page.component').then((module) => module.StatusPageComponent),
  },
];
