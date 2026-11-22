# A-CureXpress web platform

Connected healthcare platform for India: clinics, doctors, booking, online consultation and a verified medical-shop network.

- Product context: [`docs/ACureXpress_Product_Context.md`](docs/ACureXpress_Product_Context.md)
- Database guide: [`docs/SUPABASE.md`](docs/SUPABASE.md)
- Working rules for contributors and AI agents: [`CLAUDE.md`](CLAUDE.md)

## Quick start

```bash
nvm use                      # Node 22
corepack enable pnpm
pnpm install
cp .env.example .env.local   # fill from `pnpm supabase status` once the local DB is used
pnpm dev                     # http://localhost:3000 (Hindi at /hi)
```

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`.

Current state: scaffold, design system and a static signed-out Home page with typed sample data. No database schema, auth or payments yet.
