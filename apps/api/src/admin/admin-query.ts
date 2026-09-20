import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { AdminQueryDto } from './admin-query.dto';

export interface Page<T> {
  data: { list: T[]; count: number };
}

export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

// Expressions are application-owned; request values are always parameters.
export function applySearch<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  expressions: readonly string[],
  search?: string,
): void {
  if (!search || !expressions.length) return;
  builder.andWhere(
    new Brackets((where) => {
      for (const expression of expressions)
        where.orWhere(`${expression} ILIKE :search`);
    }),
    { search: containsPattern(search) },
  );
}

// For one row per root entity. To-many joins must be aggregated before pagination.
export async function paginateRaw<Row, Entity extends ObjectLiteral>(
  builder: SelectQueryBuilder<Entity>,
  query: AdminQueryDto,
  sorts: Readonly<Record<string, string>>,
  defaultSort: string,
  tieBreaker: string = defaultSort,
): Promise<Page<Row>> {
  const count = await builder.clone().getCount();
  const sort = Object.hasOwn(sorts, query.order_by)
    ? sorts[query.order_by]
    : defaultSort;
  builder.orderBy(sort, query.direction === 'asc' ? 'ASC' : 'DESC');
  if (sort !== tieBreaker) builder.addOrderBy(tieBreaker, 'ASC');
  const list = await builder
    .limit(query.page_size)
    .offset((query.page - 1) * query.page_size)
    .getRawMany<Row>();
  return { data: { list, count } };
}
