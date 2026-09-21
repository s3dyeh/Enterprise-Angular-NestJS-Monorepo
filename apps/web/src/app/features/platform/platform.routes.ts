import type { Routes } from '@angular/router';
import { PermissionCode } from '@enterprise/contracts';
import { firstTabGuard, permissionGuard } from '@app/core/guard/auth.guard';
import { unsavedFormGuard } from '@app/core/guard/unsaved-form.guard';
import { ADMIN_TABS } from '@app/core/nav/admin-nav';

export const platformRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [firstTabGuard(ADMIN_TABS, 'admin')],
    loadComponent: () =>
      import('../section/section-index.component').then((m) => m.SectionIndexComponent),
  },
  {
    path: 'users',
    canActivate: [permissionGuard],
    canDeactivate: [unsavedFormGuard],
    data: { permission: PermissionCode.UserRead },
    loadComponent: () =>
      import('../account/components/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    canDeactivate: [unsavedFormGuard],
    data: { permission: PermissionCode.RoleRead },
    loadComponent: () =>
      import('../setting/components/roles/roles.component').then((m) => m.RolesComponent),
  },
  {
    path: 'activity',
    canActivate: [permissionGuard],
    data: { permission: PermissionCode.ActivityRead },
    loadComponent: () =>
      import('../setting/components/activities/activities.component').then(
        (m) => m.ActivitiesComponent,
      ),
  },
  {
    path: 'security',
    canActivate: [permissionGuard],
    data: { permission: PermissionCode.SettingWrite },
    loadComponent: () =>
      import('../account/components/login-blocks/login-blocks.component').then(
        (m) => m.LoginBlocksComponent,
      ),
  },
  {
    path: 'configuration',
    canActivate: [permissionGuard],
    canDeactivate: [unsavedFormGuard],
    data: { permission: PermissionCode.SettingWrite },
    loadComponent: () =>
      import('../setting/components/system/system-settings.component').then(
        (m) => m.SystemSettingsComponent,
      ),
  },
  {
    path: 'maintenance',
    canActivate: [permissionGuard],
    data: { permission: PermissionCode.SettingWrite },
    loadComponent: () =>
      import('../setting/components/cache/cache.component').then((m) => m.CacheComponent),
  },
];
