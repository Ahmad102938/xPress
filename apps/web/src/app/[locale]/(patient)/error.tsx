"use client";

import { useTranslations } from "next-intl";
import { Button } from "@acurexpress/ui";

/**
 * Error boundary for the signed-in area (docs/specs/signed-in-home.md item 33). Next hides server
 * error details in production, so this never tries to tell error types apart: one calm message
 * and a retry. Shown, for example, when the sign-in gate cannot be read (AuthUnavailableError).
 */
export default function PatientError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div role="alert" className="panel border border-line p-6">
        <h1 className="text-xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-2 text-body">{t("body")}</p>
        <Button className="mt-4" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
