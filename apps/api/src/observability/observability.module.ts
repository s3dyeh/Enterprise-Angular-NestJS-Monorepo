import { TelemetryLifecycle } from './telemetry-lifecycle';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { HealthController } from './health.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (_request, response) => {
          const id = randomUUID();
          response.setHeader('X-Request-Id', id);
          return id;
        },
        serializers: {
          req: (request) => ({ id: request.id, method: request.method }),
          res: (response) => ({ statusCode: response.statusCode }),
        },
        customProps: () => ({
          traceId: trace.getActiveSpan()?.spanContext().traceId,
        }),
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers.set-cookie',
          'password',
          'token',
          'refreshToken',
          'recaptchaToken',
        ],
        autoLogging: {
          ignore: (request) =>
            ['/health/live', '/health/ready', '/metrics'].includes(
              request.url || '',
            ),
        },
      },
    }),
  ],
  controllers: [HealthController],
  providers: [MetricsService, TelemetryLifecycle],
  exports: [MetricsService, LoggerModule],
})
export class ObservabilityModule implements NestModule {
  constructor(private readonly metrics: MetricsService) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((request: Request, response: Response, next: NextFunction) => {
        const start = performance.now();
        response.on('finish', () => {
          const route =
            typeof request.route?.path === 'string'
              ? (request.route.path as string)
              : 'unmatched';
          this.metrics.requests.observe(
            {
              method: request.method,
              route,
              status: String(response.statusCode),
            },
            (performance.now() - start) / 1000,
          );
        });
        next();
      })
      .forRoutes('*');
  }
}
