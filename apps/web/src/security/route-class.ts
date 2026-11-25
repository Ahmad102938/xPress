/**
 * Route classes (docs/specs/signed-in-home.md, Technical Plan "Route classes"). The proxy, the
 * header tests and the e2e header checks all read this one list. Self-contained (no workspace or
 * `@/` imports) because next.config.ts and the proxy both load it.
 */

export type RouteClass = "public" | "private" | "home" | "auth";

/** Signed-in-only paths, without the locale prefix. `/home` is the internal rewrite target. */
export const PRIVATE_PREFIXES = [
  "/appointments",
  "/profile",
  "/account",
  "/support",
  "/home",
] as const;

export function stripLocalePrefix(
  pathname: string,
  locales: readonly string[],
): { locale: string | null; path: string } {
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) return { locale, path: "/" };
    if (pathname.startsWith(`/${locale}/`))
      return { locale, path: pathname.slice(locale.length + 1) };
  }
  return { locale: null, path: pathname };
}

export function routeClass(pathname: string, locales: readonly string[]): RouteClass {
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return "auth";
  const { path } = stripLocalePrefix(pathname, locales);
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (trimmed === "/") return "home";
  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`),
  );
  return isPrivate ? "private" : "public";
}
