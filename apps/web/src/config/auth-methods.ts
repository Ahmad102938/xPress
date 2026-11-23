import {
  hasPlaceholderLegalVersions,
  parseAuthMethods,
  type AuthMethodId,
} from "@acurexpress/core";

/**
 * Sign-in methods for this deployment, read on the server only and passed to components as props
 * (docs/specs/auth.md G1, R1-B5, R2-M5). Production hides every method while any legal version is
 * a placeholder.
 */
export function getAuthMethods(
  env: Record<string, string | undefined> = process.env,
): AuthMethodId[] {
  const blockAll = env.VERCEL_ENV === "production" && hasPlaceholderLegalVersions();
  return parseAuthMethods(env.AUTH_METHODS, { blockAll });
}

export function isMethodEnabled(
  method: AuthMethodId,
  env?: Record<string, string | undefined>,
): boolean {
  return getAuthMethods(env).includes(method);
}
