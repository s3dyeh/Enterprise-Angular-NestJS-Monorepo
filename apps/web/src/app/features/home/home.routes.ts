import type { Routes } from '@angular/router';
import { authGuard, permissionGuard } from '../../core/guard/auth.guard';
import { unsavedFormGuard } from '../../core/guard/unsaved-form.guard';
import {
  ACCOUNTING_PERMISSIONS,
  ACCOUNT_PERMISSIONS,
  SETTINGS_PERMISSIONS,
} from '../../core/nav/admin-nav';

export const homeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/sidenav/sidenav.component').then((m) => m.SidenavComponent),
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canDeactivate: [unsavedFormGuard],
        loadComponent: () =>
          import('../dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: '403',
        data: { statusCode: 403 },
        loadComponent: () =>
          import('../../core/pages/status-page.component').then((m) => m.StatusPageComponent),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: SETTINGS_PERMISSIONS },
        loadChildren: () => import('../setting/setting.routes').then((m) => m.settingRoutes),
      },
      {
        path: 'accounts',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: ACCOUNT_PERMISSIONS },
        loadChildren: () => import('../account/account.routes').then((m) => m.accountRoutes),
      },
      {
        path: 'accounting',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: ACCOUNTING_PERMISSIONS },
        loadChildren: () =>
          import('../accounting/accounting.routes').then((m) => m.accountingRoutes),
      },
    ],
  },
];
