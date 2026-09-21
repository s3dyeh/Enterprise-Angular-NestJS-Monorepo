import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();

/**
 * Run an npm command in a workspace directory and propagate non-zero exits.
 * @param {string} cwd Absolute working directory for the child process.
 * @param {string[]} args npm CLI arguments (without the npm binary).
 */
function run(cwd, args) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(npm, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    children.add(child);
    child.once('error', reject);
    child.once('exit', (code) => {
      children.delete(child);
      resolveExit(code ?? 1);
    });
  });
}

/** Ensure shared contracts are installed and built before app installs. */
async function prepareContracts() {
  const contracts = resolve(root, 'libs', 'contracts');
  const installCode = await run(contracts, ['install']);
  if (installCode !== 0) return installCode;
  return run(contracts, ['run', 'build']);
}

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
const taskName = process.argv[2];
const task = commands[taskName];
if (!task) throw new Error('Unknown task');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
  });

if (taskName === 'install' || taskName === 'check' || taskName === 'typecheck' || taskName === 'build') {
  const contractsCode = await prepareContracts();
  if (contractsCode !== 0) {
    process.exitCode = contractsCode;
  } else if (taskName === 'check' || taskName === 'typecheck') {
    const typecheckCode = await run(resolve(root, 'libs', 'contracts'), [
      'run',
      'typecheck',
    ]);
    if (typecheckCode !== 0) process.exitCode = typecheckCode;
    if (!process.exitCode && taskName === 'check') {
      process.exitCode = await run(resolve(root, 'libs', 'contracts'), ['run', 'lint']);
    }
  }
}

if (!process.exitCode) {
  await Promise.all(
    Object.entries(task).map(async ([app, jobs]) => {
      for (const args of jobs) {
        const code = await run(resolve(root, 'apps', app), args);
        if (code !== 0) {
          process.exitCode = code;
          break;
        }
      }
    }),
  );
}
