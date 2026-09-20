import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AdminMutationService } from '../admin/admin-mutation.service';
import { RedisService } from '../platform/redis.service';
import { LoginBlockEntity } from '../platform/persistence/login-block.entity';
import { LoginUnblockRequestEntity } from '../platform/persistence/login-unblock-request.entity';

@Injectable()
export class LoginUnblockService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(LoginUnblockService.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(
    private readonly source: DataSource,
    private readonly mutations: AdminMutationService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.running ??= this.reconcile()
        .catch(() => this.logger.warn('Login unblock retry deferred'))
        .finally(() => {
          this.running = undefined;
        });
    }, 5000);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  async unblock(key: string, actor: number) {
    const id = await this.mutations.mutate(async (manager) => {
      const repository = manager.getRepository(LoginUnblockRequestEntity);
      const candidate = randomUUID();
      const block = await manager
        .getRepository(LoginBlockEntity)
        .findOneBy({ key });
      const inserted = await repository
        .createQueryBuilder()
        .insert()
        .values({
          id: candidate,
          key,
          actor_id: actor,
          block_generation: block?.generation ?? null,
        })
        .orIgnore()
        .updateEntity(false)
        .returning('id')
        .execute();
      const rows = inserted.raw as { id: string }[];
      if (rows.length) {
        await this.mutations.audit(
          manager,
          actor,
          'login.unblock.requested',
          key,
        );
        return candidate;
      }
      const pending = await repository.findOneBy({
        key,
        completed_at: IsNull(),
      });
      // A worker may have completed the earlier operation after the conflict.
      return pending?.id;
    });
    if (!id) return { data: { unblocked: true } };
    try {
      if (await this.process(id)) return { data: { unblocked: true } };
    } catch {
      // The durable intent remains pending; the worker retries after recovery.
      this.logger.warn('Login unblock saved for retry');
    }
    throw new ServiceUnavailableException(
      'Unblock request is saved for automatic retry; inspect login blocks to check completion',
    );
  }

  async reconcile(): Promise<void> {
    const pending = await this.source
      .getRepository(LoginUnblockRequestEntity)
      .find({
        where: { completed_at: IsNull() },
        order: { created_at: 'ASC', id: 'ASC' },
        take: 20,
      });
    for (const request of pending) await this.process(request.id);
  }

  private process(id: string): Promise<boolean> {
    return this.mutations.mutate(async (manager) => {
      const repository = manager.getRepository(LoginUnblockRequestEntity);
      const request = await repository
        .createQueryBuilder('request')
        .where('request.id = :id', { id })
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getOne();
      if (!request) return false;
      if (request.completed_at) return true;
      // Never replay beyond the Redis deduplication horizon (7 days).
      if (Date.now() - request.created_at.getTime() > 86400000) {
        await repository.update(id, { completed_at: new Date() });
        await this.mutations.audit(
          manager,
          request.actor_id,
          'login.unblock.expired',
          request.key,
        );
        return false;
      }
      await this.redis.resetOnce(`auth:${request.key}`, request.id);
      // A retry must not erase a newer block created after Redis was reset.
      if (request.block_generation) {
        await manager
          .getRepository(LoginBlockEntity)
          .delete({ key: request.key, generation: request.block_generation });
      }
      await this.mutations.audit(
        manager,
        request.actor_id,
        'login.unblocked',
        request.key,
      );
      await repository.update(id, { completed_at: new Date() });
      return true;
    });
  }
}
