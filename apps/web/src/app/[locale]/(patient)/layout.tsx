import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { SESSION_IDLE_DEFAULT_MINUTES, parseMinutes } from "@acurexpress/core";
import { SiteShell } from "@/components/layout/site-shell";
import { IdleGuard } from "@/features/session/idle-guard";
import { PrivatePageGuard } from "@/features/session/private-page-guard";
import type { Locale } from "@/i18n/routing";

/**
 * Signed-in patient area. Still NO auth logic here (R1-M13): every page calls requirePatient()
 * inside its own <Suspense> boundary, and RLS is the real enforcement.
 *
 * Rendered per request (docs/specs/signed-in-home.md Step 0 result R2): `instant = false` lets the
 * segment block and `connection()` opts out of the static shell, so the proxy's per-request CSP
 * nonce reaches every script. The shell's patient variant passes the nonce to our inline script.
 * PrivatePageGuard handles Back after sign-out; IdleGuard signs out after inactivity.
 */
export const instant = false;

export default async function PatientLayout({ children, params }: LayoutProps<"/[locale]">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const idleMinutes = parseMinutes(process.env.SESSION_IDLE_MINUTES, SESSION_IDLE_DEFAULT_MINUTES);
  return (
    <SiteShell variant="patient">
      {children}
      <PrivatePageGuard />
      <IdleGuard timeoutMinutes={idleMinutes} />
    </SiteShell>
  );
}
