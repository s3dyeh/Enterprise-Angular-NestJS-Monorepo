import {
  ActivityResponseDto,
  LoginBlockResponseDto,
} from './settings-response.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { applySearch, paginateRaw } from '../admin/admin-query';
import { AdminStore } from '../admin/admin-store.service';
import { settings } from '../admin/catalog-resources';
import { LoginUnblockService } from './login-unblock.service';
import { ActivityEntity } from '../admin/persistence/activity.entity';
import { UserEntity } from '../users/persistence/user.entity';
import { RegionEntity } from '../geography/persistence/region.entity';
import { CityEntity } from '../geography/persistence/city.entity';
import { RoleEntity } from '../roles/persistence/role.entity';
import { RedisService } from '../platform/redis.service';
import { LoginBlockEntity } from '../platform/persistence/login-block.entity';
import { SettingDto } from './settings.dto';

const CACHE_NAMESPACES = ['dashboard'];

@Injectable()
export class SettingsService {
  constructor(
    private readonly source: DataSource,
    private readonly store: AdminStore,
    private readonly unblocks: LoginUnblockService,
    private readonly redis: RedisService,
  ) {}

  list(query: AdminQueryDto) {
    return this.store.list(settings, query);
  }

  update(id: number, body: SettingDto, actor: number) {
    // Display values only; operational configuration stays in environment variables.
    return this.store.save(
      settings,
      { value: body.value, description: body.description },
      actor,
      id,
    );
  }

  cacheKeys() {
    return { data: CACHE_NAMESPACES };
  }

  async clear(key: string) {
    if (!CACHE_NAMESPACES.includes(key))
      throw new BadRequestException('Unknown cache namespace');
    await this.redis.invalidate(key);
    return { data: { cleared: true } };
  }

  activities(query: AdminQueryDto) {
    const builder = this.source
      .getRepository(ActivityEntity)
      .createQueryBuilder('activity')
      // Historical audit names remain visible even after an account is soft-deleted.
      .withDeleted()
      .leftJoin('activity.operator', 'operator')
      .select([]);
    for (const column of ['id', 'created_at', 'event', 'operator_id', 'uri'])
      builder.addSelect('activity.' + column, column);
    builder.addSelect(
      'COALESCE(operator.username, operator.email)',
      'username',
    );
    applySearch(builder, ['activity.event', 'activity.uri'], query.search);
    return paginateRaw<ActivityResponseDto, ActivityEntity>(
      builder,
      query,
      {
        id: 'activity.id',
        created_at: 'activity.created_at',
        event: 'activity.event',
      },
      'activity.id',
    );
  }

  blocks(query: AdminQueryDto) {
    const builder = this.source
      .getRepository(LoginBlockEntity)
      .createQueryBuilder('block')
      .select('block.key', 'key')
      .addSelect('block.attempts', 'attempts')
      .addSelect('1', 'stage')
      .addSelect('true', 'locked')
      .addSelect('block.locked_until', 'locked_until')
      .addSelect(
        'GREATEST(0, EXTRACT(EPOCH FROM block.locked_until - now())::integer)',
        'retry_after_sec',
      )
      .where('block.locked_until > now()');
    return paginateRaw<LoginBlockResponseDto, LoginBlockEntity>(
      builder,
      query,
      {
        locked_until: 'block.locked_until',
        attempts: 'block.attempts',
        key: 'block.key',
      },
      'block.locked_until',
      'block.key',
    );
  }

  unblock(key: string, actor: number) {
    return this.unblocks.unblock(key, actor);
  }

  async dashboard() {
    const data = await this.redis.cached(
      'dashboard',
      'summary',
      async () => {
        const [accounts, roles, regions, cities, activity] = await Promise.all([
          this.source.getRepository(UserEntity).count(),
          this.source.getRepository(RoleEntity).count(),
          this.source.getRepository(RegionEntity).count(),
          this.source.getRepository(CityEntity).count(),
          this.source.getRepository(ActivityEntity).find({
            select: { id: true, event: true, created_at: true },
            order: { id: 'DESC' },
            take: 10,
          }),
        ]);
        return { accounts, roles, regions, cities, activity };
      },
      30,
    );
    return { data };
  }
}
