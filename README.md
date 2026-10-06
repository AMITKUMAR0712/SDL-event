# SajDhajLo

India-focused, multi-vendor marketplace for beauty services and wedding/banquet venues.

See [`CLAUDE.md`](./CLAUDE.md) for the full product and engineering specification, and
[`docs/CHANGELOG.md`](./docs/CHANGELOG.md) for what has shipped so far.

## Getting started (Windows PowerShell)

```powershell
pnpm install
Copy-Item .env.example .env   # then fill in DATABASE_URL, AUTH_SECRET, etc.
pnpm prisma migrate dev
pnpm dev
```

Visit http://localhost:3000.

## Common scripts

| Command                   | What it does                                 |
| ------------------------- | -------------------------------------------- |
| `pnpm dev`                | Start the dev server (Turbopack)             |
| `pnpm build`              | Production build                             |
| `pnpm start`              | Run the production build                     |
| `pnpm typecheck`          | `tsc --noEmit`                               |
| `pnpm lint`               | ESLint                                       |
| `pnpm format`             | Prettier, write mode                         |
| `pnpm test`               | Vitest (unit + integration)                  |
| `pnpm test:e2e`           | Playwright (builds and starts the app first) |
| `pnpm prisma migrate dev` | Create and apply a migration                 |
| `pnpm prisma studio`      | Browse the database                          |
