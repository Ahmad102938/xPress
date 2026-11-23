/**
 * "Become a partner" link in the footer bottom bar: the ONLY place on apps/web that mentions or
 * links to the partner app (partners.acurexpress.com). Never link to or mention the admin app.
 *
 * Base URL: NEXT_PUBLIC_PARTNER_URL (read at build time). In development it falls back to the
 * local partner app. If it is missing or invalid in production, the link is hidden.
 */
export const showPartnerBlock = true;

export const DEV_PARTNER_URL = "http://partners.localhost:3001";

export function resolvePartnerBase({
  show = showPartnerBlock,
  url = process.env.NEXT_PUBLIC_PARTNER_URL,
  nodeEnv = process.env.NODE_ENV,
}: { show?: boolean; url?: string; nodeEnv?: string } = {}): string | null {
  if (!show) return null;
  const candidate = url?.trim() || (nodeEnv === "development" ? DEV_PARTNER_URL : "");
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return candidate.replace(/\/+$/, "");
  } catch {
    return null;
  }
}
