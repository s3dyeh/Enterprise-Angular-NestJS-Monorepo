import type { Routes } from '@angular/router';
import { PermissionCode } from '@enterprise/contracts';
import { firstTabGuard, permissionGuard } from '../../core/guard/auth.guard';
import { unsavedFormGuard } from '../../core/guard/unsaved-form.guard';
import { ACCOUNT_TABS } from '../../core/nav/admin-nav';

export const accountRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../section/section-tabs.component').then((m) => m.SectionTabsComponent),
    data: { tabs: ACCOUNT_TABS },
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [firstTabGuard(ACCOUNT_TABS, 'accounts')],
        loadComponent: () =>
          import('../section/section-index.component').then((m) => m.SectionIndexComponent),
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
        path: 'users',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.UserRead },
        loadComponent: () =>
          import('./components/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'login-blocks',
        canActivate: [permissionGuard],
        data: { permission: PermissionCode.SettingWrite },
        loadComponent: () =>
          import('./components/login-blocks/login-blocks.component').then(
            (m) => m.LoginBlocksComponent,
          ),
      },
      {
        path: 'customers',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.AccountRead },
        loadComponent: () =>
          import('./components/customers/customers.component').then((m) => m.CustomersComponent),
      },
    ],
  },
];
