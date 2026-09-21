# Working in SaaS Foundation

This repository has independently installed Angular and NestJS applications and a shared contracts package. Read the relevant package scripts before running checks; root scripts coordinate the applications. Build contracts before checking consumers after contract changes.

## Task guidance

- For API endpoints, authorization, transactions, or migrations, read [.agents/skills/foundation-api/SKILL.md](.agents/skills/foundation-api/SKILL.md).
- For Angular screens, forms, localization, or navigation, read [.agents/skills/foundation-web/SKILL.md](.agents/skills/foundation-web/SKILL.md).
- For lint failures, tests, or delivery checks, read [.agents/skills/foundation-verify/SKILL.md](.agents/skills/foundation-verify/SKILL.md).

The product scope and extension points live in [docs/saas-boilerplate.md](docs/saas-boilerplate.md). Accounting and geography are optional examples, disabled by default. Preserve this separation when adding product features.

Use existing working-tree edits as context and preserve unrelated work. Local `.env` files contain secrets; inspect only needed values and keep credentials out of command output, fixtures, and documentation. Database verification scripts have different isolation models; read their setup and cleanup before executing them.
