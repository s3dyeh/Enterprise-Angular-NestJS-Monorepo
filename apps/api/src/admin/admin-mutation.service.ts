import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { ActivityEntity } from './persistence/activity.entity';
import { rethrowOwnerConflict } from '../workspaces/owner-conflict';

@Injectable()
export class AdminMutationService {
  constructor(private readonly source: DataSource) {}

  async audit(
    manager: EntityManager,
    actor: number,
    event: string,
    id: number | string,
  ) {
    // Use the caller's manager so the audit and business change commit together.
    await manager
      .getRepository(ActivityEntity)
      .insert({ operator_id: actor, event, uri: String(id) });
  }

  async mutate<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.source.transaction(work);
    } catch (error: unknown) {
      if (!(error instanceof QueryFailedError)) throw error;
      const { code } = error.driverError as { code?: string };
      if (code === '23505')
        throw new ConflictException('This value is already in use');
      if (code === '23503')
        throw new ConflictException(
          'The selected record does not exist or is still in use',
        );
      if (code === '23514') {
        if (
          (error.driverError as { constraint?: string }).constraint ===
          'workspace_active_owner'
        )
          rethrowOwnerConflict(error);
        throw new BadRequestException('Invalid value');
      }
      if (code === '22003')
        throw new BadRequestException('The amount exceeds the supported range');
      throw error;
    }
  }
}
