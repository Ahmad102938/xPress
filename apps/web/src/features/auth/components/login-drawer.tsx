"use client";

import { Sheet, SheetContent } from "@acurexpress/ui";
import { useTranslations } from "next-intl";
import { useAuth } from "./auth-provider";
import { LoginPanel } from "./login-panel";

/** Right drawer (420px) from md, bottom sheet (90% height) below (docs/specs/auth.md item 38). */
export function LoginDrawer({ unavailable }: { unavailable: boolean }) {
  const t = useTranslations("auth");
  const auth = useAuth();
  return (
    <Sheet open={auth.isOpen} onOpenChange={(open) => (open ? undefined : auth.closePanel())}>
      <SheetContent closeLabel={t("close")} hideClose>
        <LoginPanel
          variant="drawer"
          methods={auth.methods}
          start={auth.start}
          next={auth.next}
          initialError={auth.initialError}
          unavailable={unavailable}
          onSignedIn={auth.completeSignIn}
        />
      </SheetContent>
    </Sheet>
  );
}
