# API and security contracts

## Authentication

Browser login: `POST /api/v1/auth/browser/login` with email/password and, when enabled, recaptchaToken. The response contains the access token, expiry, and current profile. A Secure, HttpOnly, SameSite=Strict, host-only refresh cookie is issued in production. Development omits Secure and uses the name refresh; production uses __Host-refresh.

Refresh and logout are POSTs to the corresponding browser routes with credentials included. All three mutations require an exact allowlisted Origin. Do not put the frontend and API on unrelated sites; the supplied Nginx/Ingress topology keeps them same-origin. CORS is an additional browser restriction, not authorization.

Access tokens stay in browser memory. Reload recovery rotates the refresh session atomically and fetches current permissions. Reusing an old refresh token fails. Logout/revocation also invalidates outstanding access tokens because each authenticated request checks the current database session. Requests within one tab share a refresh operation. Independent tabs may race a rotation; a losing tab must recover again using the updated cookie.

Native clients may use `/auth/email/login` and bearer refresh routes. These login routes use the same reCAPTCHA verification; there is no unprotected login alternative. Do not use native refresh responses as the browser's persistent storage mechanism.

Registration: `POST /auth/email/register`; confirmation: `POST /auth/email/confirm`; forgot/reset: `POST /auth/forgot/password` and `POST /auth/reset/password`. Prefix each with /api/v1. Unconfirmed accounts cannot log in. Reset signatures are bound to the previous password hash and become invalid after a successful reset.

## reCAPTCHA v3

Set RECAPTCHA_ENABLED=true, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, RECAPTCHA_ALLOWED_HOSTNAMES (comma-separated hostnames without schemes), and optionally RECAPTCHA_MIN_SCORE (default 0.5).

The public configuration returns only enabled/siteKey. The API verifies Google's success result, exact login/register action, score threshold, allowed hostname, and token age. Missing/invalid tokens fail closed. A provider outage returns 503 rather than bypassing verification. Disabling the frontend cannot bypass the server guard. With the flag false, no Google script or verification request is made.

Provision v3 keys for the actual domain and test your score threshold with production traffic before enforcement. Keep the Google badge visible. Align privacy notices with Google's requirements. Provider unit tests use a mocked verifier; real-domain scoring requires your Google keys.

References: [Google v3](https://developers.google.com/recaptcha/docs/v3), [server verification](https://developers.google.com/recaptcha/docs/verify).

## Authorization and management

Role 1 is the built-in administrator; role 2 grants no administration permissions by default. Other roles use an allowlisted resource/action CSV. Writes imply reads for that resource. Only built-in administrators can write user or role assignments, preventing delegated privilege escalation. API guards enforce permissions even when a client bypasses navigation guards.

Management endpoints: users, customers, roles, regions, cities, currencies, settings, activities, login-blocks, clear-cache, dashboard, and account-credits. Catalog/account lists return `{data:{list,count}}`. Writes return `{data:record}` where applicable. Most deletes return 204. Validation returns 422; duplicates/referenced records return 409.

List parameters are page, page_size (maximum 100), order_by (allowlisted), direction, and search (maximum 200 characters). SQL values are parameterized. The old frontend filter expression language is removed. Legacy /users mutation endpoints are removed; use /admin/users.

Credit adjustments: `POST /admin/account-credits/adjustments`, requiring account-credit:write. Example: `{"account_id":12,"currency_id":1,"amount":"25.5000","reason":"Approved credit","idempotency_key":"a8f39bf0-8ac4-4de4-af70-ad0d6765e1a2"}`. Never create a new idempotency key merely because the previous request timed out.

## Operational safeguards

Authentication limits use shared Redis in production and bounded process memory only in local disabled mode. Redis failure rejects protected auth requests. Configure TRUST_PROXY to the actual trusted proxy CIDRs; never trust arbitrary forwarded IP headers. Tune limits for shared NAT traffic and place global abuse controls at the ingress/WAF.

Secrets belong in a secret manager or Kubernetes Secrets provisioned outside Git. Four auth signing secrets must be distinct and at least 32 characters in production. Use random entropy, rotate deliberately, and expect old sessions/reset links to expire during rotation.

S3 clients support the AWS default credential chain for workload identity. Static ACCESS_KEY_ID/SECRET_ACCESS_KEY are optional and must be supplied together. Keep buckets private and enforce size/content controls and malware scanning appropriate to your upload policy. Direct presigned uploads require corresponding bucket/CORS policies.

Logs exclude request bodies, cookies, authorization headers, and query strings. Audit history records actor, event, object identifier, and time. Metrics labels use route templates. Do not add emails, tokens, or account IDs as metric labels.


Confirmation signatures bind to the current account state. Profile/password/status changes invalidate outstanding confirmation links, including old registration links that might otherwise reactivate a suspended account. Confirming a new email revokes existing sessions. Existing links from before this change must be reissued.

Pending verification uses status 3; suspension uses status 2. The protected /auth/email/resend endpoint reissues confirmation only for pending registrations and returns the same 204 for other addresses. It uses the register reCAPTCHA action. Older inactive records are not automatically reclassified during migration; an administrator must review them.
