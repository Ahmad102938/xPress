"use client";

import { useTranslations } from "next-intl";
import { Button } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import { useAuth } from "./auth-provider";
import { UserMenu } from "./user-menu";

/**
 * Header session island (item 49): Login, "Finish sign-up" / "Confirm it is you", or the user menu,
 * from /auth/session via AuthProvider. Until that loads it shows Login, so the header stays static.
 * The Login link is the real /login?next= URL; with JavaScript the interceptor opens the panel.
 */
export function HeaderAuth() {
  const t = useTranslations("auth.header");
  const { session, openPanel } = useAuth();

  // On phones the bottom nav "Account" tab is the way in (it holds the same links), so the
  // header menu shows from md up only.
  if (session?.state === "signed_in") {
    return (
      <div className="hidden md:block">
        <UserMenu session={session} />
      </div>
    );
  }

  if (session?.state === "needs_finish" || session?.state === "step_up") {
    return (
      <Button
        size="sm"
        onClick={() => openPanel({ step: session.state === "needs_finish" ? "finish" : "step_up" })}
      >
        {session.state === "needs_finish" ? t("finishSignup") : t("confirmIdentity")}
      </Button>
    );
  }

  return (
    <Button asChild size="sm">
      <Link href="/login" data-auth-ready={session ? "" : undefined}>
        <span className="sm:hidden">{t("loginShort")}</span>
        <span className="hidden sm:inline">{t("login")}</span>
      </Link>
    </Button>
  );
}
