import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import type {
  Workspace,
  WorkspaceDetails,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@enterprise/contracts';
import { InviteDto } from './workspace.dto';

const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class WorkspacesService {
  constructor(private readonly source: DataSource) {}

  list(userId: number): Promise<Workspace[]> {
    return this.source.query(
      `SELECT w.id, w.name, m.role FROM workspaces w
      JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = $1 ORDER BY w.created_at, w.id`,
      [userId],
    );
  }

  create(userId: number, name: string): Promise<Workspace> {
    return this.source.transaction(async (manager) => {
      // Serialize workspace creation per account to enforce the resource limit.
      const active: { id: number }[] = await manager.query(
        'SELECT id FROM "user" WHERE id = $1 AND "deletedAt" IS NULL AND "statusId" = 1 FOR UPDATE',
        [userId],
      );
      if (!active.length) throw new ForbiddenException();
      const [count]: { count: number }[] = await manager.query(
        `SELECT count(*)::int AS count FROM workspace_members WHERE user_id = $1 AND role = 'owner'`,
        [userId],
      );
      if (count.count >= 20) throw new ConflictException('workspaceLimit');
      const id = randomUUID();
      await manager.query('INSERT INTO workspaces(id, name) VALUES ($1, $2)', [
        id,
        name,
      ]);
      await manager.query(
        `INSERT INTO workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [id, userId],
      );
      return { id, name, role: 'owner' };
    });
  }

  async details(id: string, userId: number): Promise<WorkspaceDetails> {
    return this.source.transaction(async (manager) => {
      const workspace = await this.authorize(manager, id, userId);
      const members: WorkspaceMember[] = await manager.query(
        `SELECT m.user_id AS "userId", u.email,
        concat_ws(' ', u."firstName", u."lastName") AS name, m.role
        FROM workspace_members m JOIN "user" u ON u.id = m.user_id
        WHERE m.workspace_id = $1 AND u."deletedAt" IS NULL ORDER BY m.created_at, m.user_id`,
        [id],
      );
      const invitations: WorkspaceInvitation[] =
        workspace.role === 'member'
          ? []
          : await manager.query(
              `
        SELECT id, email, role, expires_at AS "expiresAt" FROM workspace_invitations
        WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
        ORDER BY created_at DESC`,
              [id],
            );
      return { workspace, members, invitations };
    });
  }

  rename(id: string, userId: number, name: string): Promise<void> {
    return this.source.transaction(async (manager) => {
      await this.authorize(manager, id, userId, true);
      await manager.query('UPDATE workspaces SET name = $2 WHERE id = $1', [
        id,
        name,
      ]);
    });
  }

  invite(
    id: string,
    userId: number,
    body: InviteDto,
  ): Promise<{ token: string }> {
    return this.source.transaction(async (manager) => {
      const actor = await this.authorize(manager, id, userId, true);
      if (actor.role !== 'owner' && body.role !== 'member')
        throw new ForbiddenException('ownerRequired');
      const existing: { id: number }[] = await manager.query(
        `SELECT u.id FROM workspace_members m
        JOIN "user" u ON u.id = m.user_id WHERE m.workspace_id = $1 AND lower(u.email) = $2 AND u."deletedAt" IS NULL`,
        [id, body.email],
      );
      if (existing.length) throw new ConflictException('alreadyMember');
      const [count]: { count: number }[] = await manager.query(
        `SELECT count(*)::int AS count FROM workspace_invitations
        WHERE workspace_id = $1 AND email <> $2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
        [id, body.email],
      );
      if (count.count >= 100) throw new ConflictException('invitationLimit');
      // Reissuing invalidates the previous token, including an expired invitation.
      await manager.query(
        `UPDATE workspace_invitations SET revoked_at = now()
        WHERE workspace_id = $1 AND email = $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
        [id, body.email],
      );
      const token = randomBytes(32).toString('hex');
      await manager.query(
        `INSERT INTO workspace_invitations(id, workspace_id, email, role, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')`,
        [randomUUID(), id, body.email, body.role, digest(token)],
      );
      return { token };
    });
  }

  accept(userId: number, token: string): Promise<{ workspaceId: string }> {
    return this.source.transaction(async (manager) => {
      const [candidate]: { workspace_id: string }[] = await manager.query(
        'SELECT workspace_id FROM workspace_invitations WHERE token_hash = $1',
        [digest(token)],
      );
      if (!candidate) throw new NotFoundException('invitationInvalid');
      // All membership/invitation writes take the same lock, in the same order.
      await manager.query(
        'SELECT id FROM workspaces WHERE id = $1 FOR UPDATE',
        [candidate.workspace_id],
      );
      const [invite]: { id: string; email: string; role: WorkspaceRole }[] =
        await manager.query(
          `SELECT id, email, role
        FROM workspace_invitations WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL
        AND expires_at > now() FOR UPDATE`,
          [digest(token)],
        );
      if (!invite) throw new NotFoundException('invitationInvalid');
      const [user]: { email: string }[] = await manager.query(
        `SELECT email FROM "user" WHERE id = $1
        AND "deletedAt" IS NULL AND "statusId" = 1`,
        [userId],
      );
      if (!user || user.email?.toLowerCase() !== invite.email)
        throw new ForbiddenException('invitationEmailMismatch');
      await manager.query(
        `INSERT INTO workspace_members(workspace_id, user_id, role) VALUES ($1, $2, $3)
        ON CONFLICT (workspace_id, user_id) DO NOTHING`,
        [candidate.workspace_id, userId, invite.role],
      );
      await manager.query(
        'UPDATE workspace_invitations SET accepted_at = now() WHERE id = $1',
        [invite.id],
      );
      return { workspaceId: candidate.workspace_id };
    });
  }

  revoke(id: string, userId: number, invitationId: string): Promise<void> {
    return this.source.transaction(async (manager) => {
      const actor = await this.authorize(manager, id, userId, true);
      const rows: { id: string }[] = await manager.query(
        `UPDATE workspace_invitations SET revoked_at = now()
        WHERE id = $1 AND workspace_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL
        AND ($3 = 'owner' OR role = 'member') RETURNING id`,
        [invitationId, id, actor.role],
      );
      if (!rows.length) throw new NotFoundException();
    });
  }

  changeMember(
    id: string,
    userId: number,
    memberId: number,
    role: WorkspaceRole | null,
  ): Promise<void> {
    return this.source.transaction(async (manager) => {
      const actor = await this.authorize(manager, id, userId);
      if (role !== null) {
        const active: { id: number }[] = await manager.query(
          `SELECT id FROM "user" WHERE id = $1
          AND "deletedAt" IS NULL AND "statusId" = 1 FOR SHARE`,
          [memberId],
        );
        if (!active.length) throw new ConflictException('memberInactive');
      }
      const [target]: { role: WorkspaceRole }[] = await manager.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [id, memberId],
      );
      if (!target) throw new NotFoundException();
      const leaving = memberId === userId && role === null;
      if (
        !leaving &&
        actor.role !== 'owner' &&
        !(
          actor.role === 'admin' &&
          target.role === 'member' &&
          (role === 'member' || role === null)
        )
      ) {
        throw new ForbiddenException('ownerRequired');
      }
      if (target.role === 'owner' && role !== 'owner') {
        const [owners]: { count: number }[] = await manager.query(
          `SELECT count(*)::int AS count FROM workspace_members m
          JOIN "user" u ON u.id = m.user_id WHERE m.workspace_id = $1 AND m.role = 'owner'
          AND u."deletedAt" IS NULL AND u."statusId" = 1`,
          [id],
        );
        if (owners.count <= 1) throw new ConflictException('lastOwner');
      }
      if (role === null)
        await manager.query(
          'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
          [id, memberId],
        );
      else
        await manager.query(
          'UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2',
          [id, memberId, role],
        );
    });
  }

  private async authorize(
    manager: EntityManager,
    id: string,
    userId: number,
    manage = false,
  ): Promise<Workspace> {
    await manager.query('SELECT id FROM workspaces WHERE id = $1 FOR UPDATE', [
      id,
    ]);
    const [workspace]: Workspace[] = await manager.query(
      `SELECT w.id, w.name, m.role FROM workspaces w
      JOIN workspace_members m ON m.workspace_id = w.id WHERE w.id = $1 AND m.user_id = $2`,
      [id, userId],
    );
    // Platform administrators do not bypass workspace membership.
    if (!workspace) throw new NotFoundException();
    if (manage && workspace.role === 'member') throw new ForbiddenException();
    return workspace;
  }
}
