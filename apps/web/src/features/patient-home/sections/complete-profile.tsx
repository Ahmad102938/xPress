"use client";

import { useState, useTransition } from "react";
import { MapPin, Smartphone, UserRoundCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@acurexpress/ui";
import { dismissProfileCard } from "@/features/profiles/actions";
import { Link } from "@/i18n/navigation";

/**
 * Dismissible, never a forced form (docs/specs/signed-in-home.md). Dismissal is a device cookie.
 * A slim tinted banner under the greeting (Stitch reference): text left, actions right on wide
 * screens, stacked full-width actions on a phone.
 */
export function CompleteProfileCard({
  needsPhone,
  needsAddress,
}: {
  needsPhone: boolean;
  needsAddress: boolean;
}) {
  const t = useTranslations("patientHome.completeProfile");
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  if (hidden) return null;
  return (
    <section
      aria-labelledby="home-complete"
      className="relative flex flex-col gap-4 rounded-xl border border-brand-blue/20 bg-tint-blue p-4 pr-14 shadow-sm md:flex-row md:items-center md:justify-between md:p-5 md:pr-16"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white"
        >
          <UserRoundCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="home-complete" className="font-bold text-ink">
            {t("title")}
          </h2>
          <p className="mt-0.5 text-sm text-body">{t("body")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
        {needsPhone ? (
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link href="/account#methods">
              <Smartphone aria-hidden="true" />
              {t("verifyPhone")}
            </Link>
          </Button>
        ) : null}
        {needsAddress ? (
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link href="/profile#addresses">
              <MapPin aria-hidden="true" />
              {t("addAddress")}
            </Link>
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={() => {
          setHidden(true);
          startTransition(async () => {
            await dismissProfileCard();
          });
        }}
        className="absolute top-2 right-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand-blue md:top-1/2 md:right-3 md:-translate-y-1/2"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </section>
  );
}
