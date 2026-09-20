import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserEntity } from '../../users/persistence/user.entity';
import { StatusId } from '../../statuses/statuses.enum';
import { revokeUserSessions } from './revoke-user-sessions';
import { SessionEntity } from './session.entity';

import { SessionRepository } from './session.repository';
import { Session } from '../domain/session';

import { SessionMapper } from './session.mapper';
import { User } from '../../users/domain/user';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async create(data: Session): Promise<Session> {
    return this.sessionRepository.manager.transaction(async (manager) => {
      const user = await manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .select(['user.id', 'user.password', 'user.statusId'])
        .where('user.id = :id', { id: Number(data.user.id) })
        .setLock('pessimistic_write')
        .getOne();
      // Password verification may have raced with reset/suspension; never issue a
      // session for the stale credentials after the account lock becomes available.
      if (
        !user ||
        user.statusId !== StatusId.active ||
        user.password !== data.user.password
      )
        throw new UnauthorizedException();
      const repository = manager.getRepository(SessionEntity);
      return repository.save(
        repository.create(SessionMapper.toPersistence(data)),
      );
    });
  }

  async updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    const result = await this.sessionRepository.update(
      { id: Number(conditions.id), hash: conditions.hash, deletedAt: IsNull() },
      { hash: payload.hash },
    );

    if (!result.affected) {
      return null;
    }

    const entity = await this.sessionRepository.findOne({
      where: { id: Number(conditions.id) },
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async deleteById(id: Session['id']): Promise<void> {
    await this.sessionRepository.softDelete({
      id: Number(id),
    });
  }

  async deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    await revokeUserSessions(
      this.sessionRepository.manager,
      Number(conditions.userId),
    );
  }

  async deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    await revokeUserSessions(
      this.sessionRepository.manager,
      Number(conditions.userId),
      Number(conditions.excludeSessionId),
    );
  }
}
