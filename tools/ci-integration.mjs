import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, rm } from 'node:fs/promises';
const project = 'enterprise-ci-' + randomBytes(6).toString('hex');
async function port() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const result = server.address().port; await new Promise(resolve => server.close(resolve)); return String(result);
}
const env = { ...process.env, TEST_DATABASE_PORT: await port(), TEST_REDIS_PORT: await port(), TEST_MAIL_PORT: await port(), TEST_MAIL_UI_PORT: await port(),
  INTEGRATION_API_PORT: await port(), INTEGRATION_WEB_PORT: await port(), INTEGRATION_KEEP: 'true' };
env.INTEGRATION_ORIGIN = 'http://localhost:' + env.INTEGRATION_WEB_PORT;
env.E2E_BASE_URL = env.INTEGRATION_ORIGIN;
env.API_PROXY_TARGET = 'http://127.0.0.1:' + env.INTEGRATION_API_PORT;
env.TEST_REDIS_URL = 'redis://:local-development-only@127.0.0.1:' + env.TEST_REDIS_PORT;
env.E2E_LIVE = 'true';
let integration;
const compose = args => execFileSync('docker', ['compose', '-p', project, ...args], { env, stdio: 'inherit' });
try {
  await mkdir('.verification', { recursive: true });
  await rm('.verification/browser-session.json', { force: true });
  compose(['up', '-d', '--wait']);
  integration = spawn(process.execPath, ['tools/integration.mjs'], { env, stdio: 'inherit' });
  let ready = false;
  for (let i = 0; i < 180; i++) {
    if (integration.exitCode !== null) throw new Error('Integration suite failed');
    try { await readFile('.verification/browser-session.json'); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Integration API did not become ready');
  const browser = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], { cwd: 'apps/web', env, stdio: 'inherit' });
  const [code] = await once(browser, 'exit'); if (code !== 0) throw new Error('Browser tests failed');
} finally {
  integration?.kill('SIGTERM');
  if (integration && integration.exitCode === null) await Promise.race([once(integration, 'exit'), new Promise(resolve => setTimeout(resolve, 5000))]);
  // This project name is generated above; its disposable test volumes belong to this run only.
  compose(['down', '--volumes', '--remove-orphans']);
}

