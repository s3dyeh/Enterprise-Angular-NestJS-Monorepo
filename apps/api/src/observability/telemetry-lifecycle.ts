import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { telemetry } from '../instrumentation';
@Injectable()
export class TelemetryLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await telemetry?.shutdown();
  }
}
