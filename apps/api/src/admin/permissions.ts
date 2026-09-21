import { SetMetadata } from '@nestjs/common';
import {
  CORE_PERMISSIONS,
  PERMISSIONS,
  PermissionCode,
  type Permission,
} from '@enterprise/contracts';

export { CORE_PERMISSIONS, PERMISSIONS, PermissionCode, type Permission };

/** Attach a resource:action permission requirement to an admin route handler. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata('permission', permission);
