import { execFileSync } from 'node:child_process';
const [major, minor] = process.versions.node.split('.').map(Number);
if (!(major === 24 && minor >= 15 || major === 26)) throw new Error('Use supported Node 24.15+ or Node 26');
for (const tool of ['docker', 'kubectl', 'trivy', 'kubeconform']) {
  execFileSync('sh', ['-c', 'command -v ' + tool], { stdio: 'inherit' });
}
if (!process.env.CHROME_BIN) throw new Error('Set CHROME_BIN on the isolated Jenkins agent');

