# Changelog

Changes are grouped by release. Dates and versions are assigned when a release is actually published.

## Unreleased

### Added

- Explicit catalog response DTOs and OpenAPI response schemas.
- Independent writable catalog fields.
- Durable login-unblock requests with background reconciliation and Redis deduplication.
- MIT license, contributor/security policies, code ownership, and release documentation.

### Fixed

- Source files under `apps/api/src/files` are no longer hidden by the upload ignore rule.
- Account-state verification and authentication changes execute under an account lock with transactional session revocation.
- Login session creation rejects credentials that became stale during a concurrent password/status change.
- Login-unblock recovery preserves newer rate-limit windows and login-block generations.

### Changed

- Documented enterprise architecture, shared backend conventions, and operational boundaries.

No versioned release is declared by this changelog entry.
