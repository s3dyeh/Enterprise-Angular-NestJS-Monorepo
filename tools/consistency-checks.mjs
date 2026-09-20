import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

// Runs only in the integration runner's disposable, migrated database, before
// the API starts its retry worker. Fault injection never touches a live database.
export async function checkConsistency({ require, api, env }) {
  const load = (path) => require(resolve(api, "dist", path));
  const { DataSource } = require("typeorm");
  const { ConfigService } = require("@nestjs/config");
  const { RedisService } = load("platform/redis.service.js");
  const { AdminMutationService } = load("admin/admin-mutation.service.js");
  const { LoginUnblockService } = load("settings/login-unblock.service.js");
  const { LoginBlockEntity } = load(
    "platform/persistence/login-block.entity.js",
  );
  const { LoginUnblockRequestEntity } = load(
    "platform/persistence/login-unblock-request.entity.js",
  );
  const { UserEntity } = load("users/persistence/user.entity.js");
  const { SessionEntity } = load("session/persistence/session.entity.js");
  const { TypeOrmUserRepository } = load(
    "users/persistence/typeorm-user.repository.js",
  );
  const { TypeOrmSessionRepository } = load(
    "session/persistence/typeorm-session.repository.js",
  );
  const { AdminStore } = load("admin/admin-store.service.js");
  const { settings } = load("admin/catalog-resources.js");
  const source = new DataSource({
    type: "postgres",
    host: env.DATABASE_HOST,
    port: +env.DATABASE_PORT,
    username: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    migrations: [
      resolve(api, "dist/database/migrations/*.js").replaceAll("\\", "/"),
    ],
    entities: [resolve(api, "dist/**/*.entity.js").replaceAll("\\", "/")],
  });
  const redis = new RedisService(
    new ConfigService({
      runtime: {
        redisMode: "standalone",
        redisUrl: env.REDIS_URL,
        prefix: env.REDIS_KEY_PREFIX,
      },
    }),
  );
  await source.initialize();
  try {
    await redis.onModuleInit();
    const users = new TypeOrmUserRepository(source.getRepository(UserEntity));
    const sessions = new TypeOrmSessionRepository(
      source.getRepository(SessionEntity),
    );
    const owner = await users.findByEmail(env.SEED_ADMIN_EMAIL);
    const session = await sessions.create({ user: owner, hash: randomUUID() });
    await source.query(`CREATE FUNCTION reject_test_revocation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected revocation failure'; END $$`);
    await source.query(
      "CREATE TRIGGER reject_test_revocation BEFORE UPDATE ON session FOR EACH ROW EXECUTE FUNCTION reject_test_revocation()",
    );
    try {
      await assert.rejects(
        users.updateAtomically(owner.id, async () => ({
          changes: { password: "must-roll-back" },
          revokeSessions: {},
        })),
        /injected revocation failure/,
      );
      assert.equal((await users.findById(owner.id)).password, owner.password);
      assert.ok(
        await source.getRepository(SessionEntity).findOneBy({ id: session.id }),
      );
    } finally {
      await source.query("DROP TRIGGER reject_test_revocation ON session");
      await source.query("DROP FUNCTION reject_test_revocation()");
    }
    await assert.rejects(
      sessions.create({
        user: { ...owner, password: "stale-hash" },
        hash: randomUUID(),
      }),
      (error) => error.getStatus() === 401,
    );
    await sessions.deleteById(session.id);
    assert.equal(
      await sessions.updateByHash(
        { id: session.id, hash: session.hash },
        { hash: "rotated" },
      ),
      null,
    );

    const mutations = new AdminMutationService(source);
    const store = new AdminStore(source, mutations);
    const [setting] = await source
      .getRepository(settings.entity)
      .find({ take: 1 });
    assert.ok(setting);
    await assert.rejects(
      store.save(settings, { property: "forbidden" }, owner.id, setting.id),
      (error) => error.getStatus() === 400,
    );
    const saved = await store.save(
      settings,
      { property: "forbidden", value: setting.value },
      owner.id,
      setting.id,
    );
    assert.equal(saved.data.property, setting.property);

    const key = "d".repeat(64);
    const blocks = source.getRepository(LoginBlockEntity);
    const requests = source.getRepository(LoginUnblockRequestEntity);
    await blocks.insert({
      key,
      attempts: 8,
      locked_until: new Date(Date.now() + 60000),
    });
    const offline = new LoginUnblockService(source, mutations, {
      resetOnce: async () => {
        throw new Error("injected Redis outage");
      },
    });
    await assert.rejects(
      offline.unblock(key, owner.id),
      (error) => error.getStatus() === 503,
    );
    assert.ok(await blocks.findOneBy({ key }));
    assert.equal((await requests.findOneByOrFail({ key })).completed_at, null);
    await new LoginUnblockService(source, mutations, redis).reconcile();
    assert.equal(await blocks.findOneBy({ key }), null);
    assert.ok((await requests.findOneByOrFail({ key })).completed_at);

    const nextKey = "e".repeat(64);
    await blocks.insert({
      key: nextKey,
      attempts: 9,
      locked_until: new Date(Date.now() + 60000),
    });
    const failingMutations = new AdminMutationService(source);
    failingMutations.audit = async (manager, actor, event, id) => {
      if (event === "login.unblocked")
        throw new Error("injected audit failure after Redis reset");
      return mutations.audit(manager, actor, event, id);
    };
    await redis.consume(`auth:${nextKey}`, 60);
    await assert.rejects(
      new LoginUnblockService(source, failingMutations, redis).unblock(
        nextKey,
        owner.id,
      ),
      (error) => error.getStatus() === 503,
    );
    assert.ok(
      await blocks.findOneBy({ key: nextKey }),
      "Database deletion must roll back",
    );
    assert.equal((await redis.consume(`auth:${nextKey}`, 60)).count, 1);
    const generation = randomUUID();
    await blocks.update({ key: nextKey }, { generation, attempts: 10 });
    await new LoginUnblockService(source, mutations, redis).reconcile();
    assert.equal(
      (await redis.consume(`auth:${nextKey}`, 60)).count,
      2,
      "Retry must preserve the new Redis counter",
    );
    assert.equal(
      (await blocks.findOneByOrFail({ key: nextKey })).generation,
      generation,
    );
    await blocks.delete({ key: nextKey });
    await requests.delete({ key });
    await requests.delete({ key: nextKey });
    // Keep the existing HTTP audit fixture counts deterministic.
    await source.query("DELETE FROM activities WHERE uri = ANY($1)", [
      [key, nextKey],
    ]);
    await source.undoLastMigration({ transaction: "all" });
    await source.undoLastMigration({ transaction: "all" });
    await source.runMigrations({ transaction: "all" });
    console.log(
      "PASS: migration rollback/reapply, transactional revocation rollback, stale login rejection, catalog write allowlists, durable unblock recovery and Redis replay safety",
    );
  } finally {
    redis.onApplicationShutdown();
    await source.destroy();
  }
}
