import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { createOpenApiDocument } from './document';

/**
 * Export the OpenAPI document to apps/api/openapi/openapi.json.
 * Requires a reachable database matching apps/api/.env (same as local seed/migrate).
 */
async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    const document = createOpenApiDocument(app);
    const target = resolve(__dirname, '../../openapi/openapi.json');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`Wrote ${target}`);
  } finally {
    await app.close();
  }
}

void exportOpenApi().catch((error: unknown) => {
  console.error('OpenAPI export failed');
  console.error(error);
  process.exitCode = 1;
});
