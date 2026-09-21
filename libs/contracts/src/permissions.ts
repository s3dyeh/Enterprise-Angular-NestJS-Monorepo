/**
 * Canonical resource:action permission strings shared by the API and Angular app.
 * Keep this list on the TypeScript 5.9 feature subset so both apps can consume it.
 */
export const PermissionCode = {
  ActivityRead: 'activity:read',
  SettingWrite: 'setting:write',
  CityRead: 'city:read',
  CityWrite: 'city:write',
  RegionRead: 'region:read',
  RegionWrite: 'region:write',
  AccountRead: 'account:read',
  AccountWrite: 'account:write',
  RoleRead: 'role:read',
  RoleWrite: 'role:write',
  UserRead: 'user:read',
  UserWrite: 'user:write',
  CurrencyRead: 'currency:read',
  CurrencyWrite: 'currency:write',
  AccountCreditRead: 'account-credit:read',
  AccountCreditWrite: 'account-credit:write',
} as const;

/** Ordered permission catalog exposed by the API and used for navigation allowlists. */
export const PERMISSIONS = [
  PermissionCode.ActivityRead,
  PermissionCode.SettingWrite,
  PermissionCode.CityRead,
  PermissionCode.CityWrite,
  PermissionCode.RegionRead,
  PermissionCode.RegionWrite,
  PermissionCode.AccountRead,
  PermissionCode.AccountWrite,
  PermissionCode.RoleRead,
  PermissionCode.RoleWrite,
  PermissionCode.UserRead,
  PermissionCode.UserWrite,
  PermissionCode.CurrencyRead,
  PermissionCode.CurrencyWrite,
  PermissionCode.AccountCreditRead,
  PermissionCode.AccountCreditWrite,
] as const;

/** Single permission string from the shared catalog. */
export type Permission = (typeof PERMISSIONS)[number];
export const CORE_PERMISSION_PREFIXES = ['user', 'role', 'setting', 'activity'] as const;

export const CORE_PERMISSIONS = PERMISSIONS.filter(permission => CORE_PERMISSION_PREFIXES.some(prefix => permission.startsWith(`${prefix}:`)));
