# Enterprise web

Angular 22 standalone components with lazy feature routes, strict TypeScript, Material components, signals for local state, and shared composition helpers for forms/lists.

## Run and verify

Run `npm ci` then `npm start`. The default URL is http://localhost:4200. `proxy_local.cjs` forwards `/api` to http://localhost:3001 while preserving the browser Origin. Override `API_PROXY_TARGET` when necessary.

- `npm run check`: lint, formatting, browser unit tests, production build.
- `npm run typecheck`: application TypeScript.
- `npm run e2e`: real API browser checks; first start the root integration harness with `INTEGRATION_KEEP=true` and the matching browser origin.
- From the repository root, `node tools/ci-integration.mjs` runs the entire disposable integration/browser suite.

## API and sessions

The API prefix is `/api/v1`; management services append `/admin`. Both production and development use same-origin routing. The browser keeps access tokens in memory and restores a session through an HttpOnly refresh cookie. No authentication tokens are stored in localStorage. Theme/language preferences can persist locally.

The frontend obtains the reCAPTCHA policy and public site key from `/auth/browser/config`. Only enabled login/registration flows load the Google script. Each submission gets a fresh action-specific token. Server configuration is authoritative.

Keep feature-specific forms and request payloads in their feature folders. Shared helpers handle dialog lifecycle, paging, status messages, and unsaved changes. Route guards improve navigation; the API independently enforces every permission.

## Production

`Dockerfile` builds the app and serves it through nonroot Nginx on port 8080. `nginx.conf` provides same-origin API proxying, SPA fallback, security headers, and asset caching. The Kubernetes Service named `api` is the upstream.


