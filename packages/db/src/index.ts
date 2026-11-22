/**
 * @acurexpress/db public API.
 *
 * Runtime clients are separate entry points so server-only code never lands in a client bundle:
 *  - `@acurexpress/db/client`     browser client ("use client")
 *  - `@acurexpress/db/server`     server client bound to the request cookies
 *  - `@acurexpress/db/middleware` session refresh for an app's proxy.ts
 *
 * TODO(db): `pnpm db:types` writes `./database.types.ts`; re-export `Database` from here once the
 * first migration exists.
 */
export { getSupabasePublicEnv } from "./env";
