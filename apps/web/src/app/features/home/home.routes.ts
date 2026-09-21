import type { Routes } from '@angular/router';
import { authGuard, permissionGuard } from '../../core/guard/auth.guard';
import { ADMIN_TABS } from '../../core/nav/admin-nav';

export const homeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/sidenav/sidenav.component').then((m) => m.SidenavComponent),
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'start', pathMatch: 'full' },
      {
        path: 'start',
        loadComponent: () => import('../starter/start.component').then((m) => m.StartComponent),
      },
      {
        path: 'workspaces',
        loadComponent: () =>
          import('../workspaces/workspaces.component').then((m) => m.WorkspacesComponent),
      },
      {
        path: 'workspaces/:id',
        loadComponent: () =>
          import('../workspaces/workspace-detail.component').then(
            (m) => m.WorkspaceDetailComponent,
          ),
      },
      {
        path: 'join',
        loadComponent: () =>
          import('../workspaces/join-workspace.component').then((m) => m.JoinWorkspaceComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { permission: ADMIN_TABS.map((tab) => tab.permission) },
        loadChildren: () => import('../platform/platform.routes').then((m) => m.platformRoutes),
      },
      { path: 'dashboard', redirectTo: 'start', pathMatch: 'full' },
      { path: 'accounts/users', redirectTo: 'admin/users', pathMatch: 'full' },
      { path: 'accounts/roles', redirectTo: 'admin/roles', pathMatch: 'full' },
      { path: 'accounts/login-blocks', redirectTo: 'admin/security', pathMatch: 'full' },
      { path: 'accounts', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'settings/system', redirectTo: 'admin/configuration', pathMatch: 'full' },
      { path: 'settings/activities', redirectTo: 'admin/activity', pathMatch: 'full' },
      { path: 'settings/cache', redirectTo: 'admin/maintenance', pathMatch: 'full' },
      { path: 'settings', redirectTo: 'admin', pathMatch: 'full' },
      {
        path: '403',
        data: { statusCode: 403 },
        loadComponent: () =>
          import('../../core/pages/status-page.component').then((m) => m.StatusPageComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../core/pages/status-page.component').then((m) => m.StatusPageComponent),
      },
    ],
  },
];
