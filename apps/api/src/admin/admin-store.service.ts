import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, ObjectLiteral } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AdminQueryDto } from './admin-query.dto';
import { applySearch, paginateRaw } from './admin-query';
import { AdminMutationService } from './admin-mutation.service';
import { ResourceDefinition } from './catalog-resources';

@Injectable()
export class AdminStore {
  constructor(
    private readonly source: DataSource,
    private readonly mutations: AdminMutationService,
  ) {}

  private selection<T extends ObjectLiteral, R extends { id: number }>(
    resource: ResourceDefinition<T, R>,
  ) {
    const builder = this.source
      .getRepository(resource.entity)
      .createQueryBuilder('resource')
      .select([]);
    for (const column of resource.columns)
      builder.addSelect(`resource.${column}`, column);
    return builder;
  }

  list<T extends ObjectLiteral, R extends { id: number }>(
    resource: ResourceDefinition<T, R>,
    query: AdminQueryDto,
  ) {
    const builder = this.selection(resource);
    applySearch(
      builder,
      resource.search.map((column) => `resource.${column}::text`),
      query.search,
    );
    const sorts = Object.fromEntries(
      resource.columns.map((column) => [column, `resource.${column}`]),
    );
    return paginateRaw<R, T>(builder, query, sorts, 'resource.id');
  }

  async lookup<T extends ObjectLiteral, R extends { id: number }>(
    resource: ResourceDefinition<T, R>,
  ) {
    const data = await this.selection(resource)
      .orderBy('resource.id', 'ASC')
      .limit(1000)
      .getRawMany<R>();
    return { data };
  }

  async save<T extends ObjectLiteral, R extends { id: number }>(
    resource: ResourceDefinition<T, R>,
    values: object,
    actor: number,
    id?: number,
  ) {
    const entries = Object.entries(values).filter(
      ([key, value]) =>
        key !== 'id' &&
        (resource.writable as readonly string[]).includes(key) &&
        value !== undefined,
    );
    if (!entries.length) throw new BadRequestException('No changes supplied');
    // DTO validation checks values; the resource allowlist restricts persistence keys.
    const changes = Object.fromEntries(entries) as QueryDeepPartialEntity<T>;
    return this.mutations.mutate(async (manager) => {
      const repository = manager.getRepository(resource.entity);
      const result =
        id === undefined
          ? await repository
              .createQueryBuilder()
              .insert()
              .values(changes)
              .updateEntity(false)
              .returning([...resource.columns])
              .execute()
          : await repository
              .createQueryBuilder()
              .update()
              .set(changes)
              .where('id = :id', { id })
              .returning([...resource.columns])
              .execute();
      const rows = result.raw as R[];
      const row = rows[0];
      if (!row) throw new NotFoundException();
      await this.mutations.audit(
        manager,
        actor,
        `${resource.eventPrefix}.${id === undefined ? 'created' : 'updated'}`,
        row.id,
      );
      return { data: row };
    });
  }

  async remove<T extends ObjectLiteral, R extends { id: number }>(
    resource: ResourceDefinition<T, R>,
    id: number,
    actor: number,
  ) {
    return this.mutations.mutate(async (manager) => {
      const result = await manager.getRepository(resource.entity).delete(id);
      if (!result.affected) throw new NotFoundException();
      await this.mutations.audit(
        manager,
        actor,
        `${resource.eventPrefix}.deleted`,
        id,
      );
    });
  }
}
