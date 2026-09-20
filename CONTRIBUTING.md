# Contributing

## Prepare a change

1. Read the root README and the relevant application guide.
2. Use a supported Node version and install dependencies with `npm run bootstrap`.
3. Work on a focused branch. Describe the behavior change, compatibility impact, and validation in the pull request.
4. Add regression coverage for bugs. Keep migrations compatible with rolling deployments.
5. Update API schemas, examples, configuration documentation, and the changelog when their contracts change.

## Backend conventions

Use validated DTOs, explicit response schemas, and resource-specific read/write allowlists. Use the transaction's entity manager for every dependent write. State-bound tokens must be verified after locking the current account. New catalog response fields must not implicitly grant write access.

Use shared helpers for pagination, password policy, and session revocation. Keep specialized financial/security invariants visible in feature services. Never commit secrets, actual uploads, personal screenshots, or production data fixtures.

## Checks before review

Run `npm run check`, then build the API and run `npm run integration` with local Compose services. Run `node tools/ci-integration.mjs` for browser changes. The browser suite needs Chrome/Chromium. Run migration upgrade/revert checks on disposable databases for schema changes. Review generated OpenAPI schemas when API contracts change.

Documentation-only changes need formatting and link checks; do not run the entire application suite for a spelling fix. Screenshots must come from the current application using synthetic data.

## Review and ownership

Ahmad Sadieh is the repository maintainer and default code owner; see [.github/CODEOWNERS](.github/CODEOWNERS). Configure protected branches to require successful checks and owner review. GitHub must associate the CODEOWNERS email with an account that has write access. Authentication, permission, monetary, and migration changes need explicit invariant/failure-path review.

Send vulnerability reports through [SECURITY.md](SECURITY.md), not public pull requests. Contributions are distributed under the repository's [MIT license](LICENSE); contributors must have the right to submit their changes.

## Releases

Follow [the release procedure](docs/releases.md). A passing local suite is evidence for the tested environment, not a production capacity claim.
