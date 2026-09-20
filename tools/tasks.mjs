import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const commands = {
  install: { api: [['ci']], web: [['ci']] },
  dev: { api: [['run', 'start:dev']], web: [['start']] },
  build: { api: [['run', 'build']], web: [['run', 'build:prod']] },
  test: { api: [['test', '--', '--runInBand']], web: [['run', 'test:ci']] },
  typecheck: { api: [['run', 'typecheck']], web: [['run', 'typecheck']] },
  check: {
    api: [['run', 'format:check'], ['run', 'lint'], ['run', 'typecheck'], ['test', '--', '--runInBand'], ['run', 'build'], ['audit', '--omit=dev', '--audit-level=high']],
    web: [['run', 'check'], ['audit', '--omit=dev', '--audit-level=high']],
  },
};
const task = commands[process.argv[2]];
if (!task) throw new Error('Unknown task');
const children = new Set();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const child of children) child.kill(signal); });
await Promise.all(Object.entries(task).map(async ([app, jobs]) => {
  for (const args of jobs) {
    const code = await new Promise((resolveExit, reject) => {
      const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: resolve(root, 'apps', app), stdio: 'inherit', shell: process.platform === 'win32' });
      children.add(child);
      child.once('error', reject);
      child.once('exit', code => { children.delete(child); resolveExit(code ?? 1); });
    });
    if (code !== 0) { process.exitCode = code; break; }
  }
}));
