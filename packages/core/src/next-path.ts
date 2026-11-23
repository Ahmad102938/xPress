/**
 * Return-path sanitiser for `?next=` (docs/specs/auth.md, threat "open redirect").
 * Returns the input unchanged only when it is a same-site path; otherwise `/`.
 */

const MAX_LENGTH = 2048;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const LOOP_PREFIXES = ["/login", "/auth"];

function isSafePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("//")) return false;
  if (path.includes("\\")) return false;
  if (CONTROL_CHARS.test(path)) return false;
  // A colon before the first "?" or "#" could only appear in an odd path segment; refuse it so no
  // browser can read it as a scheme or a host:port.
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  if (pathname.includes(":")) return false;
  return true;
}

function stripLocale(pathname: string, locales: readonly string[]): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function pointsToAuth(path: string, locales: readonly string[]): boolean {
  const pathname = stripLocale(path.split(/[?#]/, 1)[0] ?? "", locales).toLowerCase();
  return LOOP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function sanitizeNextPath(input: unknown, locales: readonly string[]): string {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_LENGTH) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return "/";
  }

  if (!isSafePath(input) || !isSafePath(decoded)) return "/";
  if (pointsToAuth(input, locales) || pointsToAuth(decoded, locales)) return "/";
  return input;
}
