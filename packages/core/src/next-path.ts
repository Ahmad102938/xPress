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

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `sanitizeNextPath`, then cut the path at its first UUID segment so a record id never travels in
 * `?next=` (docs/specs/signed-in-home.md item 12): `/appointments/<uuid>` becomes `/appointments`,
 * `/hi/appointments/<uuid>/x` becomes `/hi/appointments`. Query and hash are dropped when cut.
 */
export function safeReturnPath(input: unknown, locales: readonly string[]): string {
  const safe = sanitizeNextPath(input, locales);
  const pathname = safe.split(/[?#]/, 1)[0] ?? "/";
  const segments = pathname.split("/");
  const cut = segments.findIndex((segment) => {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false;
    }
    return UUID_SEGMENT.test(decoded);
  });
  if (cut === -1) return safe;
  const kept = segments.slice(0, cut).join("/");
  return kept === "" ? "/" : kept;
}
