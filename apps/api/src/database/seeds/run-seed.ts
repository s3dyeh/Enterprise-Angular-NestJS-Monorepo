import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  try {
    await app.get(SeedService).run();
  } finally {
    await app.close();
  }
}

void runSeed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
