import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

export const telemetry =
  process.env.OTEL_ENABLED === 'true'
    ? new NodeSDK({
        serviceName: process.env.OTEL_SERVICE_NAME || 'enterprise-api',
        traceExporter: new OTLPTraceExporter(),
        instrumentations: [
          new HttpInstrumentation({
            ignoreIncomingRequestHook: (request) =>
              /^\/(health|metrics)/.test(request.url || ''),
            applyCustomAttributesOnSpan: (span, request) => {
              const path =
                ('path' in request ? request.path : request.url) || '/';
              const safePath = path.split(/[?#]/)[0];
              span.setAttribute('http.target', safePath);
              span.setAttribute('http.url', safePath);
              span.setAttribute('url.full', safePath);
              span.setAttribute('url.query', '[redacted]');
            },
          }),
          new ExpressInstrumentation(),
          new PgInstrumentation({ enhancedDatabaseReporting: false }),
        ],
      })
    : undefined;
telemetry?.start();
