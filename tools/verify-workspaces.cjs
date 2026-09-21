// Integration checks in a disposable PostgreSQL schema; never touches application rows.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const api = resolve(__dirname, '../apps/api');
const apiRequire = createRequire(resolve(api, 'package.json'));
apiRequire('reflect-metadata');
apiRequire('ts-node').register({ project: resolve(api, 'tsconfig.json'), transpileOnly: true });
const { DataSource } = apiRequire('typeorm');
const { WorkspacesService } = require(resolve(api, 'src/workspaces/workspaces.service.ts'));
const { Workspaces1790010000000 } = require(resolve(api, 'src/database/migrations/1790010000000-Workspaces.ts'));
const env = apiRequire('dotenv').parse(readFileSync(resolve(api, '.env')));
const schema = `saas_verify_${randomBytes(6).toString('hex')}`;
const source = new DataSource({ type: 'postgres', host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT), username: env.DATABASE_USERNAME, password: env.DATABASE_PASSWORD, database: env.DATABASE_NAME, extra: { options: `-c search_path=${schema}` } });
const failure = (code) => error => error.getStatus?.() === code;

async function main() {
  await source.initialize();
  try {
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.query(`CREATE TABLE "user" (id integer PRIMARY KEY, email text, "firstName" text, "lastName" text, "statusId" integer DEFAULT 1, "deletedAt" timestamp)`);
    const runner = source.createQueryRunner();
    try { await new Workspaces1790010000000().up(runner); } finally { await runner.release(); }
    for (let id = 1; id <= 5; id++) await source.query(`INSERT INTO "user" (id, email, "firstName", "lastName") VALUES ($1, $2, 'Test', 'Member')`, [id, `member${id}@example.test`]);
    const service = new WorkspacesService(source);
    const workspace = await service.create(1, 'Isolated workspace');
    assert.equal(workspace.role, 'owner');
    assert.equal((await service.list(1)).length, 1);
    assert.equal((await service.list(2)).length, 0);
    await assert.rejects(service.details(workspace.id, 2), failure(404));
    await assert.rejects(service.rename(workspace.id, 2, 'Stolen'), failure(404));
    await assert.rejects(service.changeMember(workspace.id, 1, 1, 'member'), failure(409));
    await assert.rejects(service.changeMember(workspace.id, 1, 1, null), failure(409));
    await assert.rejects(source.query('UPDATE "user" SET "statusId" = 2 WHERE id = 1'), error => error.code === '23514');
    const invite = await service.invite(workspace.id, 1, { email: 'member2@example.test', role: 'member' });
    const [stored] = await source.query('SELECT token_hash FROM workspace_invitations');
    assert.notEqual(stored.token_hash, invite.token);
    await assert.rejects(service.accept(3, invite.token), failure(403));
    assert.equal((await service.accept(2, invite.token)).workspaceId, workspace.id);
    await assert.rejects(service.accept(2, invite.token), failure(404));
    await assert.rejects(service.invite(workspace.id, 2, { email: 'member3@example.test', role: 'member' }), failure(403));
    await assert.rejects(service.changeMember(workspace.id, 2, 2, 'owner'), failure(403));
    await service.changeMember(workspace.id, 1, 2, 'admin');
    await assert.rejects(service.invite(workspace.id, 2, { email: 'member3@example.test', role: 'admin' }), failure(403));
    const expired = await service.invite(workspace.id, 1, { email: 'member3@example.test', role: 'member' });
    await source.query(`UPDATE workspace_invitations SET expires_at = now() - interval '1 minute' WHERE email = 'member3@example.test'`);
    await assert.rejects(service.accept(3, expired.token), failure(404));
    const revoked = await service.invite(workspace.id, 1, { email: 'member3@example.test', role: 'member' });
    const detail = await service.details(workspace.id, 1);
    await service.revoke(workspace.id, 1, detail.invitations.find(row => row.email === 'member3@example.test').id);
    await assert.rejects(service.accept(3, revoked.token), failure(404));
    const old = await service.invite(workspace.id, 1, { email: 'member3@example.test', role: 'member' });
    const fresh = await service.invite(workspace.id, 1, { email: 'member3@example.test', role: 'member' });
    await assert.rejects(service.accept(3, old.token), failure(404));
    await service.accept(3, fresh.token);
    assert.equal((await service.details(workspace.id, 3)).invitations.length, 0);
    const other = await service.create(4, 'Other tenant');
    await assert.rejects(service.changeMember(other.id, 1, 4, null), failure(404));
    await service.changeMember(workspace.id, 1, 2, 'owner');
    const concurrent = await Promise.allSettled([
      service.changeMember(workspace.id, 1, 1, 'member'),
      service.changeMember(workspace.id, 2, 2, 'member'),
    ]);
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await service.details(workspace.id, 1)).members.filter(member => member.role === 'owner').length, 1);
    const oneUse = await service.invite(other.id, 4, { email: 'member5@example.test', role: 'member' });
    const accepts = await Promise.allSettled([service.accept(5, oneUse.token), service.accept(5, oneUse.token)]);
    assert.equal(accepts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await service.details(other.id, 4)).members.length, 2);
    await service.changeMember(other.id, 4, 5, null);
    await assert.rejects(service.details(other.id, 5), failure(404));
    console.log('Workspace integration passed: isolation, role escalation, expiry, revocation, reissue, email binding, replay, concurrent acceptance, concurrent ownership, owner lifecycle, removal.');
  } finally {
    if (!/^saas_verify_[a-f0-9]{12}$/.test(schema)) throw new Error('Invalid verification schema');
    await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await source.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
