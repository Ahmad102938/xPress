"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ErrorNotice, SubmitButton, type ErrorKey } from "./panel-ui";

export const RESEND_SECONDS = 30;

/**
 * Code step: one input with autocomplete="one-time-code" (SMS autofill and paste work), a
 * segmented look, auto-submit at 6 digits and a 30 s resend timer.
 */
export function OtpStep({
  maskedDestination,
  onVerify,
  onResend,
  onChangeDestination,
  pending,
  error,
  notice,
}: {
  maskedDestination: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeDestination?: (() => void) | undefined;
  pending: boolean;
  error: ErrorKey | null;
  notice?: string | null;
}) {
  const t = useTranslations("auth.otp");
  const tPending = useTranslations("auth.pending");
  const id = useId();
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [seenError, setSeenError] = useState(error);
  const input = useRef<HTMLInputElement>(null);

  // A new error clears the field so the next attempt starts fresh (state adjusted during render).
  if (error !== seenError) {
    setSeenError(error);
    if (error) {
      setCode("");
      setLastSubmitted(null);
    }
  }

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function submitCode(value: string) {
    // Not blocked on `pending`: a code autofilled while the send is still settling must not be lost.
    // The same code is never submitted twice.
    if (!/^\d{6}$/.test(value) || lastSubmitted === value) return;
    setLastSubmitted(value);
    onVerify(value);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submitCode(code);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      <p className="text-sm text-body">
        {t("sentTo", { destination: maskedDestination })}{" "}
        {onChangeDestination ? (
          <button
            type="button"
            onClick={onChangeDestination}
            className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand-blue underline-offset-4 hover:underline"
          >
            {t("change")}
          </button>
        ) : null}
      </p>
      <label htmlFor={`${id}-code`} className="mt-3 block text-sm font-semibold text-ink">
        {t("label")}
      </label>
      <input
        ref={input}
        id={`${id}-code`}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          if (digits.length === 6) submitCode(digits);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        className="mt-1 h-14 w-full rounded-md border border-input bg-panel px-4 text-center font-mono text-2xl tracking-[0.6em] text-ink aria-[invalid=true]:border-error"
      />
      <ErrorNotice id={`${id}-error`} error={error} />
      {notice ? (
        <p role="status" className="mt-3 text-sm text-green-ink">
          {notice}
        </p>
      ) : null}
      <SubmitButton
        pending={pending}
        pendingLabel={tPending("verifying")}
        disabled={code.length !== 6}
      >
        {t("verify")}
      </SubmitButton>
      <div className="mt-3 text-center text-sm">
        {secondsLeft > 0 ? (
          <p className="text-body" aria-live="polite">
            {t("resendIn", { seconds: secondsLeft })}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(RESEND_SECONDS);
              onResend();
            }}
            className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand-blue underline-offset-4 hover:underline"
          >
            {t("resend")}
          </button>
        )}
      </div>
    </form>
  );
}
