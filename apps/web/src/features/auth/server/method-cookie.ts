import type { AuthMethodId } from "@acurexpress/core";
import { isDeployed } from "@acurexpress/db";

/**
 * Remembers which method the latest sign-in used, so finish_signup can record the consent source.
 * Not a security boundary: the database only accepts a method the user really has (R2-M2).
 */
export const METHOD_COOKIE = "acx_auth_method";

export function methodCookie(method: AuthMethodId) {
  return {
    name: METHOD_COOKIE,
    value: method,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isDeployed(),
      path: "/",
      maxAge: 24 * 60 * 60,
    },
  };
}
