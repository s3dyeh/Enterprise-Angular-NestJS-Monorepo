---
name: foundation-api
description: Extend the SaaS Foundation NestJS API, including workspace authorization, DTOs, shared contracts, and database migrations. Use for backend feature changes in this repository.
---

# Foundation API

Resolve paths below from the repository root. Inspect the nearest controller, service, DTO, and existing tests before adding a feature.

- Shared request/response contracts belong in `libs/contracts/src`; rebuild that package before checking API and web consumers. Swagger response classes belong beside API endpoints, because interfaces alone do not emit schema metadata.
- Workspace membership and platform permissions are separate authorization systems. Follow `apps/api/src/workspaces/workspaces.service.ts` for membership checks and owner invariants; follow `apps/api/src/admin/permission.guard.ts` for platform operations. Authentication alone does not grant either permission.
- Workspace writes serialize on the workspace row. Preserve the workspace-before-invitation lock order. Invitation tokens are stored as hashes, expire, bind to an email, and are consumed once. Return raw tokens only when creating an invitation.
- Preserve the active-owner invariant across membership changes and user deactivation/deletion. The migration trigger and service checks enforce different entry points.
- Validate external input in DTOs and keep parameterized SQL or repository calls inside the appropriate transaction. Existing TypeORM/class-validator decorators need runtime imports; type-only conversion can break dependency injection or metadata.
- Add schema changes as new migrations in `apps/api/src/database/migrations`. Keep existing data and migration history intact. Run migrations against the intended environment only; generating code does not require resetting a database.
- Business examples are gated by `ENABLE_BUSINESS_EXAMPLES`. New default SaaS features should not depend on those optional modules.

For authorization changes, test denied cross-workspace access and role escalation as well as success. For concurrency changes, exercise competing operations and rollback. Use the verification guidance in `AGENTS.md` to choose checks; report any checks that require unavailable infrastructure.
