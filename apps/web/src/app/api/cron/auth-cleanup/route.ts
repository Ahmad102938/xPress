import { timingSafeEqual } from "node:crypto";
import { hasSupabaseEnv } from "@acurexpress/db";
import {
  deleteAuthUser,
  rateLimitsCleanup,
  unconfirmedUsersOlderThan,
} from "@acurexpress/db/admin";
import { logAuthEvent } from "@/lib/log";

/**
 * Daily cleanup (docs/specs/auth.md "Cleanup job", R2-N3), called by Vercel cron with
 * `Authorization: Bearer <CRON_SECRET>`. It deletes only the ids returned by
 * unconfirmed_users_older_than('24 hours') through the Auth admin API, then old rate-limit windows.
 * Nothing else is deleted. Responses carry counts only.
 */
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!hasSupabaseEnv()) return Response.json({ ok: false }, { status: 503 });

  let deleted = 0;
  const ids = await unconfirmedUsersOlderThan(24);
  for (const id of ids) {
    try {
      await deleteAuthUser(id);
      deleted += 1;
    } catch {
      // Left for the next run.
    }
  }
  const windows = await rateLimitsCleanup();
  logAuthEvent("auth.cleanup", { outcome: "ok", count: deleted });
  return Response.json(
    { ok: true, deletedUsers: deleted, deletedWindows: windows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
