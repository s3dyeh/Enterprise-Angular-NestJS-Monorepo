# Release procedure

## Ownership and approval

Ahmad Sadieh owns release review. The configured Jenkins production-release-managers group approves production deployment; administrators must maintain that group and protect its credentials. CODEOWNERS and this document do not provision hosting-platform permissions.

## Prepare

1. Choose a version appropriate to the final compatibility impact. Move reviewed Unreleased changes into a dated release section only when publishing that release.
2. Run required quality gates and real dependency/browser tests. Check image/dependency scans and SBOMs.
3. Review OpenAPI contract changes, migrations, environment changes, and operational recovery instructions.
4. Test migrations on a disposable database and staging snapshot. Back up production and confirm the restore procedure.
5. Attach test reports, image digests, rendered manifests, and the migration/rollback plan to the release record.

## Deploy

The consolidated base migration is verified on fresh databases, including rollback and reapplication. Existing installations using earlier migration names need an explicit migration-history reconciliation plan before adoption; do not rerun the base migration against an existing schema. The login-unblock migration adds its retry table and block-generation column before the updated API starts.

Use the trusted main-branch Jenkins workflow described in [deployment.md](deployment.md). Publishing and deploying require explicit pipeline parameters. Review the exact rendered artifacts before approval. The migration job completes before application rollout; monitor probes, errors, locks, and dependency saturation afterward.

## Recover

Stop rollout on failed migration or readiness checks. Roll application images back only when the current schema remains compatible. Do not automatically revert destructive migrations. For the unblock outbox, pending intents retry every five seconds; retain Redis deduplication keys and inspect `login.unblock.expired` audit events. See [operations.md](operations.md).

## Publish evidence

Publish only measured results with their commit, environment, dataset, workload, timestamp, and limitations. Capture demonstration screenshots with synthetic data and without tokens or personal records. Follow [SECURITY.md](../SECURITY.md) for coordinated security disclosure.
