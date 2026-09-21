import type { Routes } from '@angular/router';
import { PermissionCode } from '@enterprise/contracts';
import { firstTabGuard, permissionGuard } from '../../core/guard/auth.guard';
import { unsavedFormGuard } from '../../core/guard/unsaved-form.guard';
import { SETTINGS_TABS } from '../../core/nav/admin-nav';

export const settingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../section/section-tabs.component').then((m) => m.SectionTabsComponent),
    data: { tabs: SETTINGS_TABS },
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [firstTabGuard(SETTINGS_TABS, 'settings')],
        loadComponent: () =>
          import('../section/section-index.component').then((m) => m.SectionIndexComponent),
      },
      {
        path: 'system',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.SettingWrite },
        loadComponent: () =>
          import('./components/system/system-settings.component').then(
            (m) => m.SystemSettingsComponent,
          ),
      },
      {
        path: 'activities',
        canActivate: [permissionGuard],
        data: { permission: PermissionCode.ActivityRead },
        loadComponent: () =>
          import('./components/activities/activities.component').then((m) => m.ActivitiesComponent),
      },
      {
        path: 'cache',
        canActivate: [permissionGuard],
        data: { permission: PermissionCode.SettingWrite },
        loadComponent: () =>
          import('./components/cache/cache.component').then((m) => m.CacheComponent),
      },
      {
        path: 'regions',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.RegionRead },
        loadComponent: () =>
          import('./components/regions/regions.component').then((m) => m.RegionsComponent),
      },
      {
        path: 'cities',
        canActivate: [permissionGuard],
        canDeactivate: [unsavedFormGuard],
        data: { permission: PermissionCode.CityRead },
        loadComponent: () =>
          import('./components/cities/cities.component').then((m) => m.CitiesComponent),
      },
    ],
  },
];
