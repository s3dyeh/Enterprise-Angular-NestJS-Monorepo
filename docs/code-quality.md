# Code quality

Run `npm run lint` from the root for contracts, API source/unit tests, Angular source/templates/unit tests, and Playwright tests. Each package provides `lint:fix` for supported automatic fixes. Lint exits nonzero for warnings; unused disable directives are errors. Formatting remains a separate Prettier check.

The applications use recommended TypeScript rules plus selected strict, type-aware correctness rules: floating/misused promises, invalid awaits, unnecessary assertions, duplicate union members, and exhaustive switches. Shared contracts use the strict type-checked preset. Playwright uses recommended type-checked rules; async/await is appropriate there, while Angular source follows the existing RxJS convention. Angular template accessibility rules cover inline and external templates.

These are intentionally distinct profiles, not a claim that every application enables the entire strict preset. API decorator metadata requires runtime imports. Separate type imports are allowed alongside value imports. Null comparisons may use `== null` to handle null and undefined together; other loose equality is rejected. Braces, const preference, and debugger rejection apply to application TypeScript.

Correct violations rather than masking them with `any`, unsafe casts, blanket ignores, or warning baselines. If a framework constraint requires a suppression, keep it on the specific line and explain why. Before enabling another type-aware rule, assess its diagnostics and complete the code migration in the same change.

Typed linting follows the application's TypeScript projects. Playwright has a separate `apps/web/tsconfig.e2e.json`. Root `npm run check` includes contracts lint and the application gates. For agent workflows, start with `AGENTS.md` and the project skills under `.agents/skills`.

References: [typescript-eslint configurations](https://typescript-eslint.io/users/configs/), [typed linting](https://typescript-eslint.io/getting-started/typed-linting/), and [Angular lint](https://angular.dev/cli/lint).
