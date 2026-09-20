import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Permission } from './permissions';

export interface AdminRequest extends Request {
  user: {
    id: number;
    role?: { id: number };
    sessionId: number;
    permissions?: string[];
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const permission = this.reflector.getAllAndOverride<Permission>(
      'permission',
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return false;
    // JwtStrategy loads current account, session, and role permissions on every request.
    const current = { roleId: request.user.role?.id };
    if (
      current?.roleId !== 1 &&
      ['role:write', 'user:write'].includes(permission)
    )
      return false;
    const resources = request.user.permissions ?? [];
    return (
      !!current &&
      (current.roleId === 1 ||
        resources.includes(permission) ||
        (permission.endsWith(':read') &&
          resources.includes(permission.replace(':read', ':write'))))
    );
  }
}
