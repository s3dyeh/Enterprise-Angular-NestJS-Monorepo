import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const contracts = require(resolve(root, 'libs/contracts/dist/index.js'));
const { PERMISSIONS, PermissionCode } = contracts;

/**
 * Ensure the shared permission catalog is self-consistent and consumed by API/web.
 */
const codeValues = Object.values(PermissionCode);
if (codeValues.length !== PERMISSIONS.length) {
  throw new Error('PermissionCode and PERMISSIONS length mismatch');
}
for (const permission of PERMISSIONS) {
  if (!codeValues.includes(permission)) {
    throw new Error(`PERMISSIONS entry missing from PermissionCode: ${permission}`);
  }
}

const webFiles = [
  'apps/web/src/app/core/nav/admin-nav.ts',
  'apps/web/src/app/core/nav/permissions.ts',
  'apps/web/src/app/features/accounting/accounting.routes.ts',
  'apps/web/src/app/features/setting/setting.routes.ts',
  'apps/web/src/app/features/account/account.routes.ts',
  'apps/web/src/app/features/platform/platform.routes.ts',
];

for (const relative of webFiles) {
  const text = readFileSync(resolve(root, relative), 'utf8');
  if (!text.includes("from '@enterprise/contracts'")) {
    throw new Error(`${relative} must import shared contracts`);
  }
  if (/permission:\s*'[a-z-]+:(?:read|write)'/.test(text)) {
    throw new Error(`${relative} still uses raw permission string literals`);
  }
  if (relative.endsWith('permissions.ts') && /APP_RESOURCES\s*=\s*\[/.test(text)) {
    throw new Error(`${relative} must not redefine APP_RESOURCES`);
  }
}

const apiPermissions = readFileSync(
  resolve(root, 'apps/api/src/admin/permissions.ts'),
  'utf8',
);
if (!apiPermissions.includes("from '@enterprise/contracts'")) {
  throw new Error('API permissions must re-export @enterprise/contracts');
}

/** Collect TypeScript files under a directory recursively. */
function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

for (const file of walk(resolve(root, 'apps/api/src'))) {
  const text = readFileSync(file, 'utf8');
  if (/@RequirePermission\('[a-z-]+:(?:read|write)'\)/.test(text)) {
    throw new Error(`${file} still uses raw @RequirePermission string literals`);
  }
}

console.log(
  `Verified ${PERMISSIONS.length} shared permissions across contracts, API, and web.`,
);
