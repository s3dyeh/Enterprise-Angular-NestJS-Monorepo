# Observability and operations

## Signals

- /health/live: process liveness, independent of dependency outages.
- /health/ready: PostgreSQL SELECT 1 plus Redis PING when enabled. Failed dependencies remove a replica from traffic.
- /metrics: Prometheus endpoint requiring Authorization: Bearer METRICS_TOKEN in production.
- JSON stdout logs: generated request ID, method, status, elapsed time, and trace ID when tracing is active.
- OTLP traces: HTTP, Express, PostgreSQL; configure OTEL_ENABLED and OTEL_EXPORTER_OTLP_ENDPOINT. SDK initialization precedes application imports and shutdown flushes the exporter.

The Kubernetes collector batches and exports traces through enterprise-telemetry credentials. Its memory limiter bounds buffering; exporter failure does not make business requests depend on the telemetry service. Monitor collector dropped spans/export errors in your platform telemetry.

## Prometheus and dashboards

Merge deploy/observability/prometheus.yaml into your authenticated Prometheus deployment, mount the metrics token and alerts.yaml, and configure Alertmanager notification routing. DNS discovery uses the headless api-metrics Service so every replica is scraped. Prometheus must run in the application namespace with label app=prometheus, or adapt the NetworkPolicy explicitly for your monitoring namespace.

Useful Grafana queries:

- Request throughput: `sum(rate(http_request_duration_seconds_count{job="enterprise-api"}[5m]))`
- p95 by route: `histogram_quantile(0.95,sum by(le,route)(rate(http_request_duration_seconds_bucket{job="enterprise-api"}[5m])))`
- Error ratio: `sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) / clamp_min(sum(rate(http_request_duration_seconds_count[5m])),0.001)`
- Process memory: `enterprise_process_resident_memory_bytes`

Alert rules cover missing replicas, sustained errors, and latency. Add dependency dashboards and alerts from your managed database/Redis provider, Kubernetes resource saturation, collector health, TLS expiry, backups, and email delivery. Choose SLO thresholds from measured workloads.

## Incident procedure

1. Check the last deployment, pod readiness/restarts, and request error/latency graphs.
2. Follow X-Request-Id from the response into logs; use traceId for downstream timing.
3. For database saturation, inspect connection counts, slow statements, locks, and timeout rates before increasing replicas.
4. For Redis outages, expect auth protection to return 503; restore Redis rather than disabling protection in production.
5. For Google verification failures, distinguish invalid scores/actions from provider 503s. Changes to the enforcement flag are a deliberate operational policy change.
6. For migration failures, inspect the failed Job and schema history; do not automatically reverse committed migrations.
7. For lost credits, inspect immutable credit_entries by idempotency_key. Retry the same payload/key after an uncertain response; reverse mistakes with a new compensating adjustment.

Define retention for application logs, audit history, soft-deleted sessions, and login_blocks. Partition/archive audit and credit history according to business requirements; do not silently delete financial records. Schedule bounded cleanup of expired login blocks and sessions older than the configured refresh lifetime plus a safety margin. This requires an approved retention policy and is not an automatic destructive job.

## Evidence and limits

The integration harness checks live database/Redis behavior, SMTP confirmation/reset links, readiness, metric scraping, and OTLP export to a local receiver. The Redis cluster script checks six nodes, shared counters, cache invalidation, and readiness. Browser tests exercise the real API. These checks do not replace a real Google-domain verification test, production SMTP delivery, S3/IAM validation, Kubernetes rollout/failover tests, or capacity benchmarks.

## Recovering login-unblock requests

An unblock first commits a request and request audit in PostgreSQL, then resets the Redis counter and commits completion with its audit. If the second step fails, the API returns 503 and the worker retries every five seconds in batches of 20. Inspect login blocks and audit events; resubmitting after completion creates a new unblock operation.

A Redis Lua operation records a seven-day deduplication marker atomically with deleting the counter. Requests expire after one day to avoid replay outside that horizon; inspect `login.unblock.expired` events and pending request age. A block-generation UUID prevents a delayed database completion from deleting a newer block. Workers use row locks with skip-locked behavior across replicas.

Redis persistence and a no-eviction policy for these keys are required to preserve deduplication across outages. If markers are lost through a Redis flush, restore, or eviction, repeated resets may clear a newer rate-limit window; investigate pending operations before resuming retries after such an event. Redis-disabled mode provides process-local behavior only. Include completed `login_unblock_requests` in the approved retention policy, preserving pending rows until investigated.
