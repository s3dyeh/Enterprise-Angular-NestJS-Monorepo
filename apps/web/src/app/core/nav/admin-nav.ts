export interface AdminTab {
  path: string;
  name: string;
  symbol: string;
  permission: string;
}

export const SETTINGS_TABS: AdminTab[] = [
  { path: 'system', name: 'nav.system', symbol: 'tune', permission: 'setting:write' },
  { path: 'activities', name: 'nav.activities', symbol: 'history', permission: 'activity:read' },
  { path: 'cache', name: 'nav.cache', symbol: 'cached', permission: 'setting:write' },
  { path: 'regions', name: 'settings.regions', symbol: 'map', permission: 'region:read' },
  { path: 'cities', name: 'settings.cities', symbol: 'location_city', permission: 'city:read' },
];

export const ACCOUNT_TABS: AdminTab[] = [
  { path: 'roles', name: 'settings.roles', symbol: 'verified_user', permission: 'role:read' },
  { path: 'users', name: 'nav.users', symbol: 'manage_accounts', permission: 'user:read' },
  {
    path: 'login-blocks',
    name: 'nav.loginBlocks',
    symbol: 'block',
    permission: 'setting:write',
  },
  { path: 'customers', name: 'nav.customers', symbol: 'groups', permission: 'account:read' },
];

export const ACCOUNTING_TABS: AdminTab[] = [
  {
    path: 'currencies',
    name: 'nav.currencies',
    symbol: 'payments',
    permission: 'currency:read',
  },
  {
    path: 'account-credits',
    name: 'nav.accountCredits',
    symbol: 'account_balance_wallet',
    permission: 'account-credit:read',
  },
];

export const SETTINGS_PERMISSIONS = SETTINGS_TABS.map((tab) => tab.permission);
export const ACCOUNT_PERMISSIONS = ACCOUNT_TABS.map((tab) => tab.permission);
export const ACCOUNTING_PERMISSIONS = ACCOUNTING_TABS.map((tab) => tab.permission);
