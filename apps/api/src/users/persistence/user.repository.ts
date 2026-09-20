import { NullableType } from '../../utils/types/nullable.type';
import { PaginationOptions } from '../../utils/types/pagination-options';
import { User } from '../domain/user';

import { FilterUserDto, SortUserDto } from '../dto/query-user.dto';

export abstract class UserRepository {
  abstract updateAtomically(
    id: User['id'],
    prepare: (current: User) => Promise<{
      changes: Partial<User>;
      revokeSessions?: { excludeSessionId?: number };
    }>,
  ): Promise<User>;

  abstract create(
    data: Omit<User, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<User>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: PaginationOptions;
  }): Promise<User[]>;

  abstract findById(id: User['id']): Promise<NullableType<User>>;
  abstract findByEmail(email: User['email']): Promise<NullableType<User>>;

  abstract update(id: User['id'], payload: Partial<User>): Promise<User | null>;

  abstract remove(id: User['id']): Promise<void>;
}
