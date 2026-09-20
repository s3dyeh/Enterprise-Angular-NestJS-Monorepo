# Enterprise API

NestJS with TypeScript, PostgreSQL/TypeORM, validated request DTOs, and explicit feature modules.

## Structure

- `auth`: email authentication, confirmation/reset links, JWT sessions, browser cookies.
- `users`, `session`, `files`: identity and persistence services.
- `admin`: permission guard, users/customers/roles, allowlisted CRUD persistence, transactional audit.
- `geography`, `accounting`, `settings`: business capabilities.
- `platform`: runtime configuration, reCAPTCHA verification, shared Redis protection/cache.
- `observability`: health, metrics, structured logging, telemetry shutdown.
- `database`: migrations, migration lock, explicit optional account seeding.

## Backend conventions

- Controllers validate DTOs and delegate work to services. Admin controllers use `AdminController` for JWT and permission guards; each route declares its required permission explicitly.
- Catalog CRUD uses `catalog-resources.ts` and `AdminStore`. Define the entity and its public/searchable fields once. Specialized account and credit rules stay in their own services.
- Admin list queries use `applySearch` and `paginateRaw` for literal search, allowlisted sorting, deterministic pagination, and the existing `{ data: { list, count } }` contract. The raw projection helper requires one result row per entity; aggregate to-many joins first.
- Administrative writes use `AdminMutationService`. Obtain repositories from its transaction manager and pass that same manager to audit and session-revocation helpers, so side effects roll back together.
- Password creation uses `hashPassword`; user-session revocation uses `revokeUserSessions`. Preserve the caller's HTTP error contract instead of duplicating policy.
- Use TypeORM entities and repositories/query builders for application persistence. Keep schema changes in migrations and return explicit response projections for account data.

## Development

Copy `.env.example` to an untracked `.env`, replace secrets, and use the root Compose dependencies. Run `npm ci`, `npm run migration:run`, `npm run seed`, then `npm run start:dev`.

Useful checks: `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run build`. The root integration harness creates its own database and verifies all supported business routes. Production migration command: `npm run migration:run:prod`.

Use `npm run generate -- module feature-name` or ordinary files for new modules. Hygen and nested Compose files are removed. Root Compose owns local dependencies.

## Contracts

Browser routes are under `/api/v1/auth/browser`; administrative routes are under `/api/v1/admin`. Native token routes remain under `/api/v1/auth`. Legacy `/api/v1/users` reads remain available to administrators; administrative writes use `/admin/users` so auditing and session-revocation rules apply consistently.

Do not enable schema synchronization in production. [Deployment guidance](../../docs/deployment.md) covers migrations, verified database TLS, shared storage, and secret management.
