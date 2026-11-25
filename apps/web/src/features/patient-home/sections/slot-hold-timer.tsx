"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The real slot-hold timer (docs/specs/signed-in-home.md item 52): counts down from the server's
 * hold expiry. Text changes once a minute (no ticking seconds, no animation), so reduced motion is
 * unaffected. The live region is polite, and assertive only in the last minute.
 */
export function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000));
}

export function SlotHoldTimer({
  expiresAt,
  now = () => Date.now(),
}: {
  expiresAt: string;
  now?: () => number;
}) {
  const t = useTranslations("patientHome.attention");
  const [left, setLeft] = useState(() => minutesLeft(expiresAt, now()));

  useEffect(() => {
    const interval = window.setInterval(() => setLeft(minutesLeft(expiresAt, now())), 15_000);
    return () => window.clearInterval(interval);
  }, [expiresAt, now]);

  const released = Date.parse(expiresAt) <= now();
  const text = released
    ? t("released")
    : left <= 1
      ? t("holdLastMinute")
      : t("holdLeft", { minutes: left });
  return (
    <p aria-live={left <= 1 ? "assertive" : "polite"} className="text-sm font-medium text-warning">
      {text}
    </p>
  );
}
