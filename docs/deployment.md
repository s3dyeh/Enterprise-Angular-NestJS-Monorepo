# Docker, Kubernetes, and Jenkins

## Build artifacts

```sh
docker build -t enterprise-api:local apps/api
docker build -t enterprise-web:local apps/web
kubectl kustomize deploy/kubernetes/overlays/production
```

API and web containers run as nonroot users. Kubernetes sets read-only filesystems, dropped capabilities, seccomp, resource requests/limits, probes, and a small writable /tmp. API file storage must be S3 in production. Web calls /api through Nginx; API is not publicly exposed as a separate Service.

Review and periodically update base-image versions/digests through dependency maintenance. CI scans each image and records its SBOM; deployment uses the registry digest, never a mutable release tag.

## Provision before the first release

1. Create namespace enterprise-production and configure your ingress controller, TLS certificate, DNS, network-policy CNI, and metrics-server.
2. Provision managed PostgreSQL with backups/PITR, verified TLS, and a least-privilege runtime identity. The first migration requires uuid-ossp extension permission; provision that extension beforehand if your migration identity cannot create it.
3. Provision Redis standalone or Cluster with TLS/authentication and an eviction policy suitable for rate limiting. Cluster seed addresses must be reachable at their advertised addresses.
4. Provision S3, SMTP, Google reCAPTCHA keys, and an OTLP-compatible trace backend.
5. Edit the production ConfigMap, ingress host, SMTP sender, S3 region/bucket, and network destination ranges. Replace example.com values with real deployment values.
6. Create enterprise-secrets from a protected env file or secret-manager integration. Supply DATABASE_URL, optional DATABASE_CA, AUTH_JWT_SECRET, AUTH_REFRESH_SECRET, AUTH_FORGOT_SECRET, AUTH_CONFIRM_EMAIL_SECRET, REDIS_URL (standalone) or REDIS_CLUSTER_NODES (cluster), REDIS_USERNAME/REDIS_PASSWORD when used, REDIS_TLS_CA when needed, MAIL_HOST/MAIL_USER/MAIL_PASSWORD, RECAPTCHA_SITE_KEY/RECAPTCHA_SECRET_KEY, METRICS_TOKEN, and TRUST_PROXY.
7. Create enterprise-telemetry with endpoint (HTTPS OTLP base URL) and authorization (for example Bearer plus backend token). Configure imagePullSecrets if the registry requires them.
8. Scope the Jenkins deployment identity to the namespace and required workload/config/job resources. It does not need cluster-admin. Restrict secret creation/reading to operators or your secret controller.
9. Seed the first administrator through a one-time protected job running `node dist/database/seeds/run-seed.js` with SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. Remove those seed secrets afterward.

Use the AWS workload identity mechanism provided by your cluster. The pod spec disables automatic service-account tokens; configure a dedicated service account and the provider's projected token/identity settings as required. Never grant bucket-wide administration to the API.

## Redis choices

- Local only: REDIS_MODE=disabled.
- Standalone/managed primary endpoint: REDIS_MODE=standalone and REDIS_URL=rediss://host:6379, credentials in REDIS_USERNAME/REDIS_PASSWORD.
- Cluster: REDIS_MODE=cluster and REDIS_CLUSTER_NODES=redis://node-a:6379,redis://node-b:6379,redis://node-c:6379; use separate username/password and REDIS_TLS=true.

For Cluster, REDIS_TLS controls TLS for every node regardless of the seed URL scheme. Do not embed credentials in seed URLs. Supply trusted CA contents when private certificates require them. The network policy must permit every advertised node/port, including provider-specific ports. Disable mode is rejected in production to prevent per-replica authentication limits.

## Jenkins setup

The Jenkinsfile expects an isolated Linux agent labeled enterprise-linux-node24 with supported Node/npm, Chrome (CHROME_BIN), Docker/Compose, kubectl, Trivy, and kubeconform. Install Pipeline, Credentials Binding, JUnit, Timestamper, and Lockable Resources plugins.

Use ephemeral agents and isolated Docker daemons for untrusted branches. Jenkins must load the trusted pipeline definition and prevent pull requests from accessing deployment credentials. A branch condition inside an editable Jenkinsfile is not an authorization boundary.

Configure folder variables REGISTRY_HOST, REGISTRY_NAMESPACE, PRODUCTION_URL. Create credentials enterprise-registry (username/password) and enterprise-production-kubeconfig (file). Restrict production approval to the production-release-managers group. Protect the main branch and require review.

The pipeline installs locked dependencies, runs both quality gates in parallel, runs disposable database/Redis/mail and real browser tests, builds/scans images, validates manifests, and archives SBOMs/reports. Set PUBLISH_IMAGES only for trusted main releases. DEPLOY_PRODUCTION additionally renders immutable image digests, archives the exact release, and requests approval before acquiring the production lock and deploying.

No registry publication or cluster deployment occurs by default. The repository has not been deployed to your infrastructure. Jenkins plugin compatibility and credentials must be verified on your controller.

## Migration and rollout

The release first updates the configuration and runs a uniquely named migration Job. The migration runner holds a PostgreSQL advisory lock and fails if another migrator is active. It then rolls API/web Deployments and waits for rollout health. The collector is deployed alongside them.

Use expand/contract migrations compatible with both old and new pods. A migration failure stops deployment. A rollout failure stops the pipeline without attempting to reverse the database. Inspect events and logs, choose a previously healthy image digest, and roll back application images only if the current schema remains compatible. Test restores regularly.

HPA owns API/web replica counts after the first release. The release renderer omits replicas to avoid resetting a scaled deployment. Size PostgreSQL's connection budget for the maximum replica count. Node/zone placement and managed dependency failover require validation on the actual cluster.


The supplied Ingress uses a maintained Traefik controller in namespace edge with a websecure entrypoint. Configure HTTP-to-HTTPS redirection, forwarded-header trusted IPs, HSTS, body limits, and global rate limits in that controller or your edge platform. Adapt the ingress class and NetworkPolicy together if your platform supplies a different controller. The retired community ingress-nginx controller is not required; see the [Kubernetes retirement notice](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/) and [Traefik Ingress configuration](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/).
