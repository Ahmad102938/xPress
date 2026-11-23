/**
 * @acurexpress/db public API.
 *
 * Runtime clients are separate entry points so server-only code never lands in a client bundle:
 *  - `@acurexpress/db/client`     browser client ("use client"), public reads only, never auth
 *  - `@acurexpress/db/server`     server client bound to the request cookies, plus the code sender
 *  - `@acurexpress/db/middleware` session refresh for an app's proxy.ts
 *  - `@acurexpress/db/admin`      SERVER-ONLY service-role helpers (four permitted uses)
 */
export { getSupabasePublicEnv, hasSupabaseEnv } from "./env";
export {
  authCookieOptions,
  hasSupabaseAuthCookie,
  isDeployed,
  SESSION_MAX_AGE_SECONDS,
  withSessionMaxAge,
} from "./cookies";
export type { Database, Json } from "./database.types";
export type { Session, User } from "@supabase/supabase-js";
