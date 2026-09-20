import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Histogram,
  Registry,
} from '@prometheus-io/client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly requests = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration by route template',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });
  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'enterprise_' });
  }
}
