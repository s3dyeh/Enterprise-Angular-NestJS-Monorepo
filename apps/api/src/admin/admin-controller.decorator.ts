import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators, Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from './permission.guard';

export function AdminController(path = 'admin'): ClassDecorator {
  return applyDecorators(
    Controller({ path, version: '1' }),
    ApiBearerAuth(),
    UseGuards(AuthGuard('jwt'), PermissionGuard),
  );
}
