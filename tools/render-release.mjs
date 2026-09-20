import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const yaml = require('yaml');
const api = (await readFile('.artifacts/api.image', 'utf8')).trim();
const web = (await readFile('.artifacts/web.image', 'utf8')).trim();
for (const image of [api, web]) if (!/^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(image)) throw new Error('An immutable image digest is required');
const sha = process.env.RELEASE_SHA, build = process.env.BUILD_NUMBER;
if (!/^[a-f0-9]{40}$/.test(sha || '') || !/^\d+$/.test(build || '')) throw new Error('Invalid release identity');
const documents = yaml.parseAllDocuments(execFileSync('kubectl', ['kustomize', 'deploy/kubernetes/overlays/production'], { encoding: 'utf8' })).map(document => document.toJSON());
for (const document of documents) {
  if (document.kind === 'Deployment' && ['api','web'].includes(document.metadata.name)) document.spec.template.spec.containers[0].image = document.metadata.name === 'api' ? api : web;
  // HPA owns the replica count after the first rollout.
  if (document.kind === 'Deployment' && ['api','web'].includes(document.metadata.name)) delete document.spec.replicas;
}
await writeFile('.artifacts/production.yaml', documents.map(document => yaml.stringify(document)).join('---\n'));
const config = documents.find(document => document.kind === 'ConfigMap' && document.metadata.name === 'enterprise-config');
await writeFile('.artifacts/config.yaml', yaml.stringify(config));
const migration = yaml.parse(await readFile('deploy/kubernetes/base/migration.yaml', 'utf8'));
migration.metadata.name = 'enterprise-migration-' + sha.slice(0, 12) + '-' + build;
migration.spec.template.spec.containers[0].image = api;
await writeFile('.artifacts/migration.yaml', yaml.stringify(migration));

