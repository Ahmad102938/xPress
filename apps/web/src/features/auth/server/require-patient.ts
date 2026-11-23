import { getLocale } from "next-intl/server";
import type { User } from "@acurexpress/db";
import { sanitizeNextPath } from "@acurexpress/core";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { authState, type AuthState } from "./auth-state";

/** The `step` values `/login` understands (docs/specs/auth.md R2-N6). */
export type LoginStep = "finish" | "step_up";

/** `/login?next=<path>` plus `&step=` when the gate is needed. `nextPath` is sanitised here. */
export function loginHref(nextPath: string, step?: LoginStep) {
  const next = sanitizeNextPath(nextPath, routing.locales);
  return { pathname: "/login" as const, query: step ? { next, step } : { next } };
}

/**
 * Guard for every protected page (R1-M13). Call it inside the page's <Suspense> boundary.
 * Signed out -> /login?next=; gate needed -> /login?next=&step=; otherwise the signed-in state.
 */
export type SignedInState = AuthState & { state: "signed_in"; user: User };

export async function requirePatient(nextPath: string): Promise<SignedInState> {
  const auth = await authState();
  const locale = await getLocale();
  if (auth.state === "signed_in" && auth.user) return auth as SignedInState;

  const step: LoginStep | undefined =
    auth.state === "needs_finish" ? "finish" : auth.state === "step_up" ? "step_up" : undefined;
  // Return to the same language after sign-in (Hindi pages live under /hi).
  const localizedNext = locale === routing.defaultLocale ? nextPath : `/${locale}${nextPath}`;
  return redirect({ href: loginHref(localizedNext, step), locale });
}
