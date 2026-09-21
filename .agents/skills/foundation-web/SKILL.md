---
name: foundation-web
description: Build SaaS Foundation Angular screens and forms with bilingual RTL layouts, local error feedback, and the existing Material design system. Use for frontend changes in this repository.
---

# Foundation Web

Resolve paths from the repository root. Read `docs/saas-design.md` for visual decisions and inspect a neighboring feature before editing.

- Use standalone components, `inject()`, OnPush, typed reactive forms, and the existing RxJS request lifecycle. Component subscriptions should end with component destruction; loading state must clear on success and failure.
- Routes in `features/home/home.routes.ts` are the default product surface; platform administration is separate. Relative paths in this paragraph are under `apps/web/src/app`.
- Reuse `features/starter/saas-ui.ts` and the shared styles where their abstractions fit. Theme colors belong in `apps/web/src/theme.scss`. Keep loading, empty, error, and success states usable, without simulated activity or nonfunctional controls.
- Add user-facing text to both `apps/web/src/assets/i18n/en.json` and `ar.json`. Use logical CSS properties; the root CDK direction binding handles Material overlays and drawers. Preserve LTR input for tokens and email addresses, and isolate mixed-direction display text.
- Field-specific 422 errors belong beside their controls. Use `LOCAL_FEEDBACK` when a form handles server errors locally so the global interceptor does not duplicate feedback; preserve global authentication handling.
- Keep invitation tokens in the URL fragment. Preserve the complete return URL through authentication so invited users return to the acceptance flow. Invitation creation currently produces a shareable link, not an email delivery confirmation.
- Make icon buttons named, focus visible, and controls touch-friendly. Check Arabic and English at desktop and narrow mobile widths, including dark mode for changed color treatments.

Finish by running the relevant lint/type checks and tests. For changed workflows, use the browser verification script described in the verification skill; inspect screenshots instead of assuming a passing assertion proves visual quality.
