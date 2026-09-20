import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseMigration1790000000000 implements MigrationInterface {
  name = 'BaseMigration1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "role" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "status" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_e12743a7086ec826733f54e1d95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "path" character varying NOT NULL, CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user" ("id" SERIAL NOT NULL, "email" character varying, "password" character varying, "provider" character varying NOT NULL DEFAULT 'email', "socialId" character varying, "firstName" character varying, "lastName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "photoId" uuid, "roleId" integer, "statusId" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "REL_75e2be4ce11d447ef43be0e374" UNIQUE ("photoId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9bd2fe7a8e694dedc4ec2f666f" ON "user" ("socialId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_58e4dbff0e1a32a9bdc861bb29" ON "user" ("firstName") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f0e1b4ecdca13b177e2e3a0613" ON "user" ("lastName") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "session" ("id" SERIAL NOT NULL, "hash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" integer, CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session" ("userId") `,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f" FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_dc18daa696860586ba4667a9d31" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `INSERT INTO "role" ("id", "name") VALUES (1, 'Admin'), (2, 'User') ON CONFLICT ("id") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "status" ("id", "name") VALUES (1, 'Active'), (2, 'Inactive') ON CONFLICT ("id") DO NOTHING`,
    );

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS role_id_seq;`);
    await queryRunner.query(
      `SELECT setval('role_id_seq', GREATEST((SELECT COALESCE(MAX(id), 2) FROM role), 2));`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "id" SET DEFAULT nextval('role_id_seq');`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD COLUMN IF NOT EXISTS "resources" text NOT NULL DEFAULT '';`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" varchar(80);`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" varchar(40);`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_type" varchar(16) NOT NULL DEFAULT 'user';`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT user_account_type CHECK (account_type IN ('user', 'customer'));`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique ON "user"(lower(username)) WHERE username IS NOT NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS user_account_listing ON "user"(account_type, id) WHERE "deletedAt" IS NULL;`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS regions(id serial PRIMARY KEY, name varchar(100) NOT NULL UNIQUE);`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS cities(id serial PRIMARY KEY, name varchar(100) NOT NULL, region_id integer NOT NULL REFERENCES regions(id) ON DELETE RESTRICT, UNIQUE(name, region_id));`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS cities_region_idx ON cities(region_id, id);`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS currencies(id serial PRIMARY KEY, name varchar(100) NOT NULL UNIQUE, symbol varchar(12) NOT NULL);`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS app_settings(id serial PRIMARY KEY, property varchar(100) NOT NULL UNIQUE, value varchar(2000) NOT NULL, description varchar(500) NOT NULL DEFAULT '');`,
    );
    await queryRunner.query(
      `INSERT INTO app_settings(property, value, description) VALUES('company_name', 'Enterprise', 'Public company display name'), ('support_email', 'support@example.com', 'Public support contact') ON CONFLICT (property) DO NOTHING;`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS activities(id bigserial PRIMARY KEY, operator_id integer REFERENCES "user"(id), event varchar(100) NOT NULL, uri varchar(200) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS activities_created_idx ON activities(created_at DESC, id DESC);`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS account_credits(id serial PRIMARY KEY, account_id integer NOT NULL REFERENCES "user"(id), currency_id integer NOT NULL REFERENCES currencies(id), balance numeric(20,4) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id, currency_id));`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS credit_entries(id bigserial PRIMARY KEY, credit_id integer NOT NULL REFERENCES account_credits(id), amount numeric(20,4) NOT NULL CHECK(amount <> 0), idempotency_key uuid NOT NULL UNIQUE, reason varchar(300) NOT NULL, operator_id integer NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now());`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS credit_entries_account_idx ON credit_entries(credit_id, created_at DESC);`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS login_blocks(key varchar(64) PRIMARY KEY, attempts integer NOT NULL, locked_until timestamptz NOT NULL);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS login_blocks_expiry_idx ON login_blocks(locked_until);`,
    );
    await queryRunner.query(
      `INSERT INTO status(id, name) VALUES(3, 'Pending verification') ON CONFLICT (id) DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop dependent business tables before the account and role tables.
    await queryRunner.query(
      'DROP TABLE IF EXISTS credit_entries, account_credits, activities, login_blocks, app_settings, currencies, cities, regions',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "session", "user", "file", "status", "role"',
    );
    await queryRunner.query('DROP SEQUENCE IF EXISTS role_id_seq');
  }
}
