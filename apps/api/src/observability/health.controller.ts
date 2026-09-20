import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { RedisService } from '../platform/redis.service';
import { RuntimeConfig } from '../platform/runtime.config';
import { MetricsService } from './metrics.service';

@Controller()
export class HealthController {
  constructor(
    private readonly source: DataSource,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}
  @Get('health/live') live() {
    return { status: 'ok' };
  }
  @Get('health/ready') async ready() {
    try {
      await this.source.query('SELECT 1');
      if (!(await this.redis.ready())) throw new Error('Redis unavailable');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Dependencies unavailable');
    }
  }
  @Get('metrics') async scrape(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const runtime = this.config.getOrThrow<RuntimeConfig>('runtime');
    if (runtime.production || runtime.metricsToken) {
      const expected = createHash('sha256')
        .update(`Bearer ${runtime.metricsToken}`)
        .digest();
      const supplied = createHash('sha256')
        .update(request.headers.authorization || '')
        .digest();
      if (!runtime.metricsToken || !timingSafeEqual(expected, supplied))
        throw new NotFoundException();
    }
    response.setHeader('Cache-Control', 'no-store');
    response
      .type(this.metrics.registry.contentType)
      .send(await this.metrics.registry.metrics());
  }
}
