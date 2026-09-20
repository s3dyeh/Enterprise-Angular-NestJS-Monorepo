import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoginUnblockRequests1790000000002 implements MigrationInterface {
  async up(query: QueryRunner): Promise<void> {
    await query.query(
      'ALTER TABLE login_blocks ADD COLUMN generation uuid NOT NULL DEFAULT uuid_generate_v4()',
    );
    await query.query(`CREATE TABLE login_unblock_requests (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), key varchar(64) NOT NULL,
      actor_id integer NOT NULL REFERENCES "user"(id), block_generation uuid,
      created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
    )`);
    await query.query(
      'CREATE UNIQUE INDEX login_unblock_pending_key ON login_unblock_requests(key) WHERE completed_at IS NULL',
    );
  }
  async down(query: QueryRunner): Promise<void> {
    await query.query('DROP TABLE login_unblock_requests');
    await query.query('ALTER TABLE login_blocks DROP COLUMN generation');
  }
}
