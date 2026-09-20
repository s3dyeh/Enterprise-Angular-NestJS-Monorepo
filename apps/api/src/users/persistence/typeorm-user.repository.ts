import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { NullableType } from '../../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from '../dto/query-user.dto';
import { User } from '../domain/user';
import { UserRepository } from './user.repository';
import { UserMapper } from './user.mapper';
import { PaginationOptions } from '../../utils/types/pagination-options';
import { revokeUserSessions } from '../../session/persistence/revoke-user-sessions';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async updateAtomically(
    id: User['id'],
    prepare: Parameters<UserRepository['updateAtomically']>[1],
  ): Promise<User> {
    return this.usersRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(UserEntity);
      // Lock the user before verifying state-bound links or changing credentials.
      // Do not lock eager outer joins: PostgreSQL cannot lock nullable join sides.
      const locked = await repository
        .createQueryBuilder('user')
        .select('user.id')
        .where('user.id = :id', { id: Number(id) })
        .setLock('pessimistic_write')
        .getOne();
      if (!locked) throw new NotFoundException('User not found');
      const entity = await repository.findOneByOrFail({ id: locked.id });
      const current = UserMapper.toDomain(entity);
      const mutation = await prepare(current);
      const updated = await repository.save(
        repository.create(
          UserMapper.toPersistence({ ...current, ...mutation.changes }),
        ),
      );
      if (mutation.revokeSessions) {
        await revokeUserSessions(
          manager,
          locked.id,
          mutation.revokeSessions.excludeSessionId,
        );
      }
      return UserMapper.toDomain(updated);
    });
  }

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const newEntity = await this.usersRepository.save(
      this.usersRepository.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: PaginationOptions;
  }): Promise<User[]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (filterOptions?.roles?.length) {
      where.role = filterOptions.roles.map((role) => ({
        id: Number(role.id),
      }));
    }

    const entities = await this.usersRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return entities.map((user) => UserMapper.toDomain(user));
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const entity = await this.usersRepository.findOne({
      where: { id: Number(id) },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;

    const entity = await this.usersRepository.findOne({
      where: { email },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User> {
    return this.updateAtomically(id, () =>
      Promise.resolve({ changes: payload }),
    );
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }
}
