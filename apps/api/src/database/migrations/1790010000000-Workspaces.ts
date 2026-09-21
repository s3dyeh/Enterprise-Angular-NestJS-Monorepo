import { MigrationInterface, QueryRunner } from 'typeorm';

export class Workspaces1790010000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE workspaces (
        id uuid PRIMARY KEY,
        name varchar(80) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE workspace_members (
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id integer NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role varchar(10) NOT NULL CHECK (role IN ('owner','admin','member')),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (workspace_id, user_id)
      );
      CREATE INDEX workspace_members_user_idx ON workspace_members(user_id);
      CREATE TABLE workspace_invitations (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email varchar(254) NOT NULL,
        role varchar(10) NOT NULL CHECK (role IN ('admin','member')),
        token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        accepted_at timestamptz,
        revoked_at timestamptz
      );
      CREATE INDEX workspace_invitations_workspace_idx ON workspace_invitations(workspace_id);
      CREATE UNIQUE INDEX workspace_invitations_pending_idx ON workspace_invitations(workspace_id, email)
        WHERE accepted_at IS NULL AND revoked_at IS NULL;
      CREATE FUNCTION protect_workspace_owner() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE owned uuid;
      BEGIN
        IF TG_OP = 'UPDATE' AND NEW."deletedAt" IS NULL AND NEW."statusId" = 1 THEN RETURN NEW; END IF;
        FOR owned IN SELECT workspace_id FROM workspace_members WHERE user_id = OLD.id AND role = 'owner' ORDER BY workspace_id LOOP
          PERFORM id FROM workspaces WHERE id = owned FOR UPDATE;
          IF NOT EXISTS (SELECT 1 FROM workspace_members m JOIN "user" u ON u.id = m.user_id
            WHERE m.workspace_id = owned AND m.role = 'owner' AND u.id <> OLD.id
            AND u."deletedAt" IS NULL AND u."statusId" = 1) THEN
            RAISE EXCEPTION 'Workspace requires an active owner' USING ERRCODE = '23514', CONSTRAINT = 'workspace_active_owner';
          END IF;
        END LOOP;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER workspace_owner_lifecycle BEFORE UPDATE OF "deletedAt", "statusId" OR DELETE ON "user"
        FOR EACH ROW EXECUTE FUNCTION protect_workspace_owner();
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER workspace_owner_lifecycle ON "user"; DROP FUNCTION protect_workspace_owner(); DROP TABLE workspace_invitations; DROP TABLE workspace_members; DROP TABLE workspaces;',
    );
  }
}
