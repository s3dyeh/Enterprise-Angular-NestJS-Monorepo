import { EntityManager, IsNull, Not } from 'typeorm';
import { SessionEntity } from './session.entity';

export async function revokeUserSessions(
  manager: EntityManager,
  userId: number,
  excludeSessionId?: number,
): Promise<void> {
  await manager.getRepository(SessionEntity).softDelete({
    user: { id: userId },
    deletedAt: IsNull(),
    ...(excludeSessionId === undefined ? {} : { id: Not(excludeSessionId) }),
  });
}
