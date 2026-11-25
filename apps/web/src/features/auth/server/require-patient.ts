import { cache } from "react";
import { getLocale } from "next-intl/server";
import { createClient } from "@acurexpress/db/server";
import type { User } from "@acurexpress/db";
import { safeReturnPath } from "@acurexpress/core";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { loadProfileContext } from "@/features/profiles/server/selected-profile";
import { authState, type AuthState } from "./auth-state";

/** The `step` values `/login` understands (docs/specs/auth.md R2-N6). */
export type LoginStep = "finish" | "step_up";

/** `/login?next=<path>` plus `&step=` when the gate is needed. `nextPath` is sanitised here. */
export function loginHref(nextPath: string, step?: LoginStep) {
  const next = safeReturnPath(nextPath, routing.locales);
  return { pathname: "/login" as const, query: step ? { next, step } : { next } };
}

/**
 * Guard for every protected page (R1-M13). Call it inside the page's <Suspense> boundary.
 * Signed out -> /login?next=; gate needed -> /login?next=&step=; otherwise the signed-in state.
 */
export type SignedInState = AuthState & { state: "signed_in"; user: User };

/** Thrown when the gate cannot be read; the (patient) error boundary shows a retry message. */
export class AuthUnavailableError extends Error {
  constructor() {
    super("auth gate unavailable");
    this.name = "AuthUnavailableError";
  }
}

export async function requirePatient(nextPath: string): Promise<SignedInState> {
  const auth = await authState();
  const locale = await getLocale();
  if (auth.state === "signed_in" && auth.user) return auth as SignedInState;
  if (auth.state === "unavailable") throw new AuthUnavailableError();

  const step: LoginStep | undefined =
    auth.state === "needs_finish" ? "finish" : auth.state === "step_up" ? "step_up" : undefined;
  // Return to the same language after sign-in (Hindi pages live under /hi).
  const localizedNext = locale === routing.defaultLocale ? nextPath : `/${locale}${nextPath}`;
  return redirect({ href: loginHref(localizedNext, step), locale });
}

/**
 * requirePatient plus the account's patient profiles and the selected one, read with the user's
 * session (docs/specs/signed-in-home.md item 34). Cached per request.
 */
export const requirePatientContext = cache(async (nextPath: string) => {
  const auth = await requirePatient(nextPath);
  const supabase = await createClient();
  const context = await loadProfileContext(supabase, auth.user.id);
  return { auth, supabase, ...context };
});
