---
name: foundation-verify
description: Choose and run SaaS Foundation lint, type, unit, database, and browser checks. Use when validating changes or diagnosing failed quality gates in this repository.
---

# Foundation Verification

Start at the repository root and read package scripts for the current commands. Each application has its own dependencies and lockfile. `npm run bootstrap` installs the coordinated workspace; use it when dependencies are absent. Root `npm run lint` checks contracts, API, and Angular source/templates and browser tests with zero warnings.

For lint changes, read `docs/code-quality.md`. Fix the underlying problem, retaining runtime decorator imports. Any narrow suppression must explain the concrete framework or library constraint. A broad rule disable or generated baseline is not a passing migration.

Choose checks by affected behavior:

| Change | Verification |
| --- | --- |
| Contracts | Build and typecheck contracts, then both consumers |
| API behavior | API lint, typecheck, affected Jest tests; full unit suite after broad edits |
| Angular behavior | Web lint, typecheck, affected unit tests; production build for templates/styles |
| Workspace authorization or transactions | `node tools/verify-workspaces.cjs` |
| Authentication, invitations, navigation, RTL | `node tools/verify-saas-ui.cjs` |
| Cross-service or optional business examples | `npm run integration` |
| Delivery gate | `npm run check` |

`verify-workspaces.cjs` reads local API database configuration and creates/drops its own temporary schema. `verify-saas-ui.cjs` requires running web/API services and configured seed credentials; it creates temporary users and workspaces in the local database and cleans up its named fixtures. The integration script provisions isolated infrastructure and explicitly enables optional business examples. Inspect script prerequisites when the environment differs.

Root checks also include dependency audits, so distinguish registry/network or infrastructure failures from code failures. After a failed command, diagnose the first actionable failure and rerun the affected check. Finish with observed results and remaining blockers; do not report an unrun check as passed.
