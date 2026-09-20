# Architecture and scaling

## Repository and deployment boundaries

Keep the monorepo while the same team changes frontend and backend together. The web image and API image are separate deployable units. Their lockfiles and TypeScript versions remain isolated. Root tooling orchestrates existing commands without introducing an additional build framework.

The backend is a modular monolith. New business areas receive a module, validated DTOs, services, controller permissions, migrations, and integration coverage. Reuse the small allowlisted catalog store for simple reference tables; keep financial and identity invariants in explicit services. Avoid exposing arbitrary tables, SQL columns, or permission strings from a request.

Split a service when measured deployment, scaling, ownership, or reliability needs justify it. A separate repository is useful for independent ownership/access policies; it does not itself improve runtime performance.

## Data consistency

PostgreSQL is authoritative. Business writes and audit identifiers share transactions. Role/status changes immediately affect requests because JWT validation checks the live session and role. Password changes, suspensions, and role reassignment revoke sessions.

Credit balances use PostgreSQL numeric(20,4), never floating-point arithmetic. Each adjustment requires a caller-generated UUID, amount string, currency, account, and reason. A unique UUID constraint on the adjustment ledger coordinates concurrent insert claims across replicas before the balance is incremented. Conflicting reuse returns 409. Replays do not apply the amount again; they return the current balance, which may include later adjustments. Entries are append-only through the API; reversals are new negative adjustments.

A transaction-level row lock on the built-in administrator role serializes administrative account mutations before the target account is locked. This protects the last active administrator; it is not used for ordinary reads or credit transactions.

## Scaling boundaries

API replicas are stateless with shared PostgreSQL sessions, Redis limits/cache, and S3 storage. Set verified TLS and credentials for each dependency. Redis Cluster supports shared rate counters using single-key Lua scripts and explicit hash tags. Cache invalidation increments a namespace version; it never runs FLUSHALL.

The default pool is ten database connections per API replica. Budget the maximum replicas multiplied by this value, plus migrations/administration, against PostgreSQL capacity. Use a tested pooler when necessary. Queries have a five-second statement timeout and bounded pages. Catalog lookups cap at 1,000 options; large reference sets should move to searchable selectors.

Lists currently use count plus bounded offset pagination. That is appropriate for administration, but deep pages, wildcard search, and dashboard counts must be measured on production-sized datasets. For very large datasets introduce keyset APIs, indexed search/read models, and precomputed counters before increasing limits. Do not promise scale based on small fixture tests.

## Capacity verification

Run `tools/load.js` with k6 against a staging dataset and a short-lived read-only token. It is a starting workload, not a million-user simulation. Expand it with realistic traffic mixes, tenant sizes, login bursts, credit contention, file uploads, and background work. Keep mutations in disposable test accounts.

Record p50/p95/p99 latency, throughput, error rates, event-loop delay, database query/pool saturation, Redis latency, queue depth when queues are added, and cost. Test rolling deploys, lost Redis/database connections, node failure, expired certificates, restore times, and HPA stabilization. Define an SLO and capacity envelope from those results.

Login unblocking persists a retry request before resetting Redis, with an idempotent reset marker and a worker in each API replica. PostgreSQL row locks coordinate workers. Other asynchronous workflows should use a transactional outbox and idempotent workers. Email is currently synchronous with bounded SMTP timeouts; high-volume delivery should move to a durable queue with retries and delivery monitoring.

## Account consistency and API contracts

Authentication link consumption locks the account before verifying its state-bound token. Password/email changes and session revocation commit together. Session creation rechecks the locked account's password and status, rejecting logins whose earlier password check raced with a reset or suspension. Refresh rotation excludes soft-deleted sessions.

Catalog definitions distinguish response columns from writable fields. Settings identifiers remain read-only even if a caller bypasses HTTP validation. Named response DTOs and the shared API response decorator expose concrete OpenAPI schemas for administrative envelopes, pagination, and decimal strings.

The upload ignore rule targets runtime files under `apps/api/files/`; the source module under `apps/api/src/files/` remains version controlled.
