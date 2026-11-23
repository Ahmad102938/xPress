"use client";

import { useTranslations } from "next-intl";
import { Button } from "@acurexpress/ui";
import { ErrorNotice, type ErrorKey } from "./panel-ui";

export interface StepUpOptions {
  maskedEmail: string | null;
  google: boolean;
  emailEnabled: boolean;
  googleEnabled: boolean;
}

/**
 * 90-day step-up (Q13). Accounts with email or Google confirm with a second factor; phone-only
 * accounts answer "Is this your account?". "No" signs out and points to Contact us.
 */
export function StepUpStep({
  options,
  pending,
  error,
  onSendEmail,
  onGoogle,
  onConfirmOwner,
  onNotMine,
}: {
  options: StepUpOptions;
  pending: boolean;
  error: ErrorKey | null;
  onSendEmail: () => void;
  onGoogle: () => void;
  onConfirmOwner: () => void;
  onNotMine: () => void;
}) {
  const t = useTranslations("auth.stepUp");
  const emailOption = options.maskedEmail && options.emailEnabled;
  const googleOption = options.google && options.googleEnabled;
  const phoneOnly = !options.maskedEmail && !options.google;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {emailOption ? (
        <Button size="lg" className="w-full" disabled={pending} onClick={onSendEmail}>
          {t("sendEmail", { email: options.maskedEmail ?? "" })}
        </Button>
      ) : null}
      {googleOption ? (
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={onGoogle}
        >
          {t("google")}
        </Button>
      ) : null}
      {phoneOnly ? (
        <>
          <p className="text-base font-semibold text-ink">{t("question")}</p>
          <Button size="lg" className="w-full" disabled={pending} onClick={onConfirmOwner}>
            {t("yes")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={onNotMine}
          >
            {t("no")}
          </Button>
          <p className="text-sm text-body">{t("noHelp")}</p>
        </>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}
