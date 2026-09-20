import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const prefix = 'enterprise-redis-' + randomBytes(5).toString('hex');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const names = Array.from({ length: 6 }, (_, index) => prefix + '-' + index);
const image = process.env.API_IMAGE || 'enterprise-api:verification';
try {
  docker(['network', 'create', '--internal', prefix]);
  for (const name of names) docker(['run', '-d', '--name', name, '--network', prefix, 'redis:7.4-alpine',
    'redis-server', '--cluster-enabled', 'yes', '--cluster-node-timeout', '2000', '--appendonly', 'no', '--protected-mode', 'no']);
  const addresses = names.map(name => docker(['inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', name]) + ':6379');
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    try { for (const name of names) docker(['exec', name, 'redis-cli', 'ping']); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error('Redis nodes did not start');
  docker(['exec', names[0], 'redis-cli', '--cluster', 'create', ...addresses, '--cluster-replicas', '1', '--cluster-yes']);
  for (let attempt = 0; attempt < 20; attempt++) {
    if (docker(['exec', names[0], 'redis-cli', 'cluster', 'info']).includes('cluster_state:ok')) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const code = `
    const assert=require('node:assert/strict');
    const {ConfigService}=require('@nestjs/config');
    const {RedisService}=require('./dist/platform/redis.service');
    const {loadRuntimeConfig}=require('./dist/platform/runtime.config');
    (async()=>{
      const config=new ConfigService({runtime:loadRuntimeConfig()});
      const first=new RedisService(config),second=new RedisService(config);
      await Promise.all([first.onModuleInit(),second.onModuleInit()]);
      try {
        assert.equal(await first.ready(),true);
        const counts=await Promise.all([first.consume('shared',60),second.consume('shared',60)]);
        assert.deepEqual(counts.map(value=>value.count).sort(),[1,2]);
        assert.equal(await first.cached('dashboard','test',async()=>17),17);
        assert.equal(await second.cached('dashboard','test',async()=>99),17);
        await second.invalidate('dashboard');
        assert.equal(await first.cached('dashboard','test',async()=>99),99);
        await first.reset('shared');
        assert.equal((await second.consume('shared',60)).count,1);
        console.log('PASS: six-node Redis Cluster, shared rate limits, cache, invalidation, reset and readiness');
      } finally {first.onApplicationShutdown();second.onApplicationShutdown();}
    })().catch(error=>{console.error(error);process.exitCode=1});
  `;
  console.log(docker(['run', '--rm', '--network', prefix, '-e', 'NODE_ENV=test', '-e', 'REDIS_MODE=cluster',
    '-e', 'REDIS_CLUSTER_NODES=' + addresses.map(value => 'redis://' + value).join(','),
    image, 'node', '-e', code]));
} finally {
  for (const name of names) { try { docker(['rm', '-f', name]); } catch {} }
  try { docker(['network', 'rm', prefix]); } catch {}
}

