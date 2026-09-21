import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

export function rethrowOwnerConflict(error: unknown): never {
  if (error instanceof QueryFailedError) {
    const driver = error.driverError as { constraint?: string };
    if (driver.constraint === 'workspace_active_owner') {
      throw new ConflictException('errors.workspaceOwner');
    }
  }
  throw error;
}
