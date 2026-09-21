const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const apiRequire = createRequire(resolve(root, 'apps/api/package.json'));
const webRequire = createRequire(resolve(root, 'apps/web/package.json'));
const env = apiRequire('dotenv').parse(readFileSync(resolve(root, 'apps/api/.env')));
const marker = Date.now();
const testEnv = { ...process.env, SAAS_TEST_WORKSPACE: 'Browser verification ' + marker, SAAS_TEST_EMAIL: env.SEED_ADMIN_EMAIL, SAAS_TEST_PASSWORD: env.SEED_ADMIN_PASSWORD, SAAS_MEMBER_EMAIL: 'saas-verify-' + marker + '@example.test', SAAS_MEMBER_PASSWORD: randomBytes(24).toString('hex'), E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:4200' };
if (!testEnv.SAAS_TEST_EMAIL || !testEnv.SAAS_TEST_PASSWORD) throw new Error('Set both seed credentials in apps/api/.env before verifying the local UI.');
async function main() {
  const { Client } = apiRequire('pg');
  const client = new Client({ host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT), user: env.DATABASE_USERNAME, password: env.DATABASE_PASSWORD, database: env.DATABASE_NAME });
  await client.connect();
  let memberId;
  try {
    const hash = await apiRequire('bcryptjs').hash(testEnv.SAAS_MEMBER_PASSWORD, 10);
    const result = await client.query('INSERT INTO "user" (email, password, "firstName", "lastName", "roleId", "statusId") VALUES ($1, $2, $3, $4, 2, 1) RETURNING id', [testEnv.SAAS_MEMBER_EMAIL, hash, 'SaaS', 'Verification']);
    memberId = result.rows[0].id;
    const run = spawnSync(process.execPath, [webRequire.resolve('@playwright/test/cli'), 'test', 'e2e/saas.spec.ts'], { cwd: resolve(root, 'apps/web'), env: testEnv, stdio: 'inherit', windowsHide: true });
    process.exitCode = run.status ?? 1;
  } finally {
    // Exact names are unique to this run; do not remove other application rows.
    await client.query('DELETE FROM workspaces w USING workspace_members m, "user" u WHERE w.id = m.workspace_id AND m.user_id = u.id AND u.email = $1 AND m.role = $2 AND w.name = ANY($3)', [testEnv.SAAS_TEST_EMAIL, 'owner', [testEnv.SAAS_TEST_WORKSPACE, testEnv.SAAS_TEST_WORKSPACE + ' invitations', testEnv.SAAS_TEST_WORKSPACE + ' isolation']]);
    if (memberId) {
      await client.query('DELETE FROM session WHERE "userId" = $1', [memberId]);
      await client.query('DELETE FROM "user" WHERE id = $1 AND email = $2', [memberId, testEnv.SAAS_MEMBER_EMAIL]);
    }
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
