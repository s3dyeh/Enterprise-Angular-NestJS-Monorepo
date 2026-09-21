import type { Routes } from '@angular/router';
import { PermissionCode } from '@enterprise/contracts';
import { firstTabGuard, permissionGuard } from '../../core/guard/auth.guard';
import { unsavedFormGuard } from '../../core/guard/unsaved-form.guard';
import { ACCOUNTING_TABS } from '../../core/nav/admin-nav';

export const accountingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../section/section-tabs.component').then((m) => m.SectionTabsComponent),
    data: { tabs: ACCOUNTING_TABS },
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [firstTabGuard(ACCOUNTING_TABS, 'accounting')],
        loadComponent: () =>
          import('../section/section-index.component').then((m) => m.SectionIndexComponent),
      },
      {
        path: 'currencies',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.CurrencyRead },
        loadComponent: () =>
          import('./components/currencies/currencies.component').then((m) => m.CurrenciesComponent),
      },
      {
        path: 'account-credits',
        canActivate: [permissionGuard],
        data: { permission: PermissionCode.AccountCreditRead },
        loadComponent: () =>
          import('./components/account-credits/account-credits.component').then(
            (m) => m.AccountCreditsComponent,
          ),
      },
    ],
  },
];
