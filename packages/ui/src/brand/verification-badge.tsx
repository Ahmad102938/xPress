import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BadgeType } from "@acurexpress/core";
import { cn } from "../lib/utils";

/*
 * Public doctor badges (Addendum B, §25 "Status labels").
 * The two levels must never look alike:
 *  - Verified: blue shield-check icon, navy text, white pill.
 *  - Registered: plain grey outline, no icon.
 * Which badge a doctor gets is decided on the server/database, never in UI code.
 */

export function VerifiedBadge({ className }: { className?: string }) {
  const t = useTranslations("badges");
  return (
    <span
      title={t("verifiedHint")}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border border-tint-blue bg-panel px-2 py-0.5 text-[13px] leading-5 font-semibold text-deep-blue",
        className,
      )}
    >
      <ShieldCheck aria-hidden="true" className="size-4 text-brand-blue" strokeWidth={2.25} />
      {t("verified")}
    </span>
  );
}

export function RegisteredBadge({ className }: { className?: string }) {
  const t = useTranslations("badges");
  return (
    <span
      title={t("registeredHint")}
      className={cn(
        "inline-flex w-fit items-center rounded-full border border-[#94a3b8] bg-panel px-2 py-0.5 text-[13px] leading-5 font-medium text-body",
        className,
      )}
    >
      {t("registered")}
    </span>
  );
}

export function DoctorBadge({ type, className }: { type: BadgeType; className?: string }) {
  return type === "verified" ? (
    <VerifiedBadge className={className} />
  ) : (
    <RegisteredBadge className={className} />
  );
}
