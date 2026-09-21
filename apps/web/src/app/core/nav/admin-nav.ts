import { PermissionCode, type Permission } from '@enterprise/contracts';

export interface AdminTab {
  path: string;
  name: string;
  symbol: string;
  permission: Permission;
}

export const SETTINGS_TABS: AdminTab[] = [
  {
    path: 'system',
    name: 'nav.system',
    symbol: 'tune',
    permission: PermissionCode.SettingWrite,
  },
  {
    path: 'activities',
    name: 'nav.activities',
    symbol: 'history',
    permission: PermissionCode.ActivityRead,
  },
  {
    path: 'cache',
    name: 'nav.cache',
    symbol: 'cached',
    permission: PermissionCode.SettingWrite,
  },
  {
    path: 'regions',
    name: 'settings.regions',
    symbol: 'map',
    permission: PermissionCode.RegionRead,
  },
  {
    path: 'cities',
    name: 'settings.cities',
    symbol: 'location_city',
    permission: PermissionCode.CityRead,
  },
];

export const ACCOUNT_TABS: AdminTab[] = [
  {
    path: 'roles',
    name: 'settings.roles',
    symbol: 'verified_user',
    permission: PermissionCode.RoleRead,
  },
  {
    path: 'users',
    name: 'nav.users',
    symbol: 'manage_accounts',
    permission: PermissionCode.UserRead,
  },
  {
    path: 'login-blocks',
    name: 'nav.loginBlocks',
    symbol: 'block',
    permission: PermissionCode.SettingWrite,
  },
  {
    path: 'customers',
    name: 'nav.customers',
    symbol: 'groups',
    permission: PermissionCode.AccountRead,
  },
];

export const ACCOUNTING_TABS: AdminTab[] = [
  {
    path: 'currencies',
    name: 'nav.currencies',
    symbol: 'payments',
    permission: PermissionCode.CurrencyRead,
  },
  {
    path: 'account-credits',
    name: 'nav.accountCredits',
    symbol: 'account_balance_wallet',
    permission: PermissionCode.AccountCreditRead,
  },
];

export const SETTINGS_PERMISSIONS = SETTINGS_TABS.map((tab) => tab.permission);
export const ACCOUNT_PERMISSIONS = ACCOUNT_TABS.map((tab) => tab.permission);
export const ACCOUNTING_PERMISSIONS = ACCOUNTING_TABS.map((tab) => tab.permission);

// Platform administration is distinct from membership in a customer workspace.
export const ADMIN_TABS: AdminTab[] = [
  { path: 'users', name: 'saas.nav.users', symbol: 'people', permission: PermissionCode.UserRead },
  {
    path: 'roles',
    name: 'saas.nav.roles',
    symbol: 'admin_panel_settings',
    permission: PermissionCode.RoleRead,
  },
  {
    path: 'activity',
    name: 'saas.nav.activity',
    symbol: 'history',
    permission: PermissionCode.ActivityRead,
  },
  {
    path: 'security',
    name: 'saas.nav.security',
    symbol: 'shield',
    permission: PermissionCode.SettingWrite,
  },
  {
    path: 'configuration',
    name: 'saas.nav.configuration',
    symbol: 'tune',
    permission: PermissionCode.SettingWrite,
  },
  {
    path: 'maintenance',
    name: 'saas.nav.maintenance',
    symbol: 'cached',
    permission: PermissionCode.SettingWrite,
  },
];
