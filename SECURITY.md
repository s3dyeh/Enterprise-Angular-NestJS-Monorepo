# Security policy

## Report a vulnerability privately

Email **Ahmad Sadieh** at [saadyehahmmad@gmail.com](mailto:saadyehahmmad@gmail.com). Use a subject beginning with `Security report: enterprise-monorepo`.

Include the affected commit/version, prerequisites, reproduction steps, impact, and a minimal proof of concept using synthetic data. Do not include live credentials, customer records, or exploit details in a public issue. If a secure transfer channel is needed, request one before sending sensitive material.

The maintainer will coordinate investigation, a fix, and disclosure with the reporter. No response-time service-level agreement or paid bug-bounty program is established by this policy.

## Supported code

Security maintenance currently targets the latest reviewed code on the default branch. There is no published long-term-support release matrix. Deployment owners should keep pinned dependencies and base images current, monitor advisories, and validate their own configuration and infrastructure.

## Disclosure and releases

Reporters and maintainers should agree on publication timing after evaluating the impact and affected deployments. Releases that address vulnerabilities should identify affected/fixed versions and mitigations without publishing credentials or personal information. Record fixes in [CHANGELOG.md](CHANGELOG.md).

Repository controls do not replace a deployment's access reviews, backups, retention rules, incident procedures, or compliance assessment. See [operational guidance](docs/operations.md).
