import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS = [
  'activity:read',
  'setting:write',
  'city:read',
  'city:write',
  'region:read',
  'region:write',
  'account:read',
  'account:write',
  'role:read',
  'role:write',
  'user:read',
  'user:write',
  'currency:read',
  'currency:write',
  'account-credit:read',
  'account-credit:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const RequirePermission = (permission: Permission) =>
  SetMetadata('permission', permission);
