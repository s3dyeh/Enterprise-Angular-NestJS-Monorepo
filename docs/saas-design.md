# SaaS interface direction

Design guidance: UI UX Pro Max, queried for `B2B SaaS minimalism` with variance 2, and Angular reactive forms. The selected style is Minimalism & Swiss Style: a quiet canvas, clear typographic hierarchy, compact navigation, and visible focus states. The generic marketing-page pattern in the search output is not used inside the authenticated product.

Use the existing Angular Material components and Material icon family. The palette uses a blue primary, neutral surfaces, and semantic tokens in light and dark mode. Retain local system typography with Noto Sans Arabic to ensure legible Arabic without loading remote fonts. Do not apply Latin letter spacing to Arabic headings.

The sidebar has workspace navigation, personal controls, and a permission-filtered platform group. Each destination is a real route, with an active state and `aria-current`. No fake billing plans, charts, usage numbers, or “coming soon” controls.

The root CDK `dir` binding updates Material drawers, menus, selects, and dialogs when the language changes. Use `position="start"` for the drawer, logical margins and padding, and `<bdi>` for mixed-direction email addresses. Email fields and invitation links retain LTR input direction. On mobile the drawer overlays content, closes after navigation, and stays keyboard accessible.

Feedback uses inline errors, explicit save/loading states, retry paths, empty states, and confirmation before removing workspace membership. New invitation links explicitly state that no email was sent. Respect reduced motion. Verify English and Arabic, light and dark, desktop and a 375px viewport.

The start page uses a navy welcome section, a decorative geometric workspace illustration, two actionable setup cards, and a compact capabilities row. The illustration is hidden from assistive technology and omitted on smaller screens. Hero colors are semantic theme tokens with readable foregrounds. Navigation uses rounded active surfaces; workspace rows expose hover and keyboard focus, with direction-aware arrows. Authentication cards share the same corner shapes and accent treatment. Keep the interface free of fabricated activity and progress indicators.
