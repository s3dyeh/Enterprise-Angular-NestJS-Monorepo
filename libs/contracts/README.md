# `@enterprise/contracts`

Shared constants and types for the API and Angular applications.

## Contents

- Permission catalog (`PERMISSIONS`, `PermissionCode`)
- Pagination limits (`PAGE_SIZE_*`, `PER_PAGE_OPTIONS`)
- List envelope types (`ListPage`, `ListEnvelope`)

## Design rules

- Keep this package free of NestJS, TypeORM, and Angular dependencies.
- Stay on the TypeScript 5.9 feature subset so both apps can consume the published `dist`.
- Do not introduce npm workspaces; apps depend on this package with `file:../../libs/contracts`.

## Commands

```sh
npm install
npm run build
npm run typecheck
```
