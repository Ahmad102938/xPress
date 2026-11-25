"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@acurexpress/ui";
import {
  reverifyOptions,
  sendReverifyCode,
  verifyReverifyCode,
  type ReverifyChannel,
} from "../actions";
import { TurnstileWidget, isCaptchaEnabled } from "./turnstile-widget";

/**
 * Re-verify dialog (docs/specs/signed-in-home.md item 47). Opens when a protected action answers
 * `reauth_required`; sends a code to the account's OWN phone (default) or email, checks it, then
 * retries the action. The title names the action, so it never looks like the 90-day "Is this
 * your account?" step-up. Google re-verify is not offered (Step 0 result).
 */

export type ReverifyAction =
  | "change_phone"
  | "change_email"
  | "add_phone"
  | "add_email"
  | "connect_google"
  | "sign_out_all"
  | "delete_request";

type Channel = { channel: ReverifyChannel; masked: string };
const ERROR_KEYS = [
  "rate_limited",
  "invalid_or_expired",
  "too_many_attempts",
  "mismatch",
  "invalid_input",
  "unavailable",
  "captcha_failed",
] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];

function toErrorKey(error: string | undefined): ErrorKey {
  return (ERROR_KEYS as readonly string[]).includes(error ?? "")
    ? (error as ErrorKey)
    : "unavailable";
}

export function ReverifyDialog({
  action,
  onDone,
  onCancel,
}: {
  action: ReverifyAction;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("reverify");
  const locale = useLocale();
  const codeId = useId();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void reverifyOptions().then((result) => {
      if (!cancelled) setChannels(result.ok ? result.channels : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = channels?.[index];
  const other = channels && channels.length > 1 ? channels[(index + 1) % channels.length] : null;
  const onToken = useCallback((token: string | null) => setCaptcha(token), []);

  async function send() {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    const result = await sendReverifyCode({
      channel: current.channel,
      ...(captcha ? { captchaToken: captcha } : {}),
    });
    setBusy(false);
    if (result.ok) {
      setSent(true);
      setTimeout(() => codeInput.current?.focus(), 0);
    } else setError(toErrorKey(result.error));
  }

  async function verify() {
    if (!current || busy) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError("invalid_input");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await verifyReverifyCode({ channel: current.channel, code: code.trim() });
    setBusy(false);
    if (result.ok) onDone();
    else if (result.error === "mismatch") window.location.replace("/");
    else setError(toErrorKey(result.error));
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onCancel())}>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>{t(`titles.${action}`)}</DialogTitle>
        {channels === null ? (
          <p aria-busy="true" className="h-12" />
        ) : !current ? (
          <DialogDescription>{t("noChannel")}</DialogDescription>
        ) : (
          <>
            <DialogDescription>
              {sent
                ? t("sent", { destination: current.masked })
                : t("intro", { destination: current.masked })}
            </DialogDescription>
            {sent ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verify();
                }}
              >
                <label htmlFor={codeId} className="text-sm font-semibold text-ink">
                  {t("codeLabel")}
                </label>
                <input
                  ref={codeInput}
                  id={codeId}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${codeId}-error` : undefined}
                  className="min-h-12 rounded-lg border border-line px-3 text-lg tracking-[0.3em] text-ink focus-visible:outline-2 focus-visible:outline-brand-blue"
                />
                <Button type="submit" disabled={busy}>
                  {t("verify")}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void send()}>
                  {t("sendAgain")}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                {isCaptchaEnabled() ? <TurnstileWidget onToken={onToken} locale={locale} /> : null}
                <Button
                  type="button"
                  disabled={busy || (isCaptchaEnabled() && !captcha)}
                  onClick={() => void send()}
                >
                  {t("send")}
                </Button>
                {other ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIndex((value) => (value + 1) % (channels?.length ?? 1))}
                  >
                    {other.channel === "email" ? t("useEmail") : t("usePhone")}
                  </Button>
                ) : null}
              </div>
            )}
            {error ? (
              <p id={`${codeId}-error`} role="alert" className="text-sm font-medium text-error">
                {t(`errors.${error}`)}
              </p>
            ) : null}
          </>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

type Guardable = { ok: boolean; error?: string };

/**
 * Runs a protected action; on `reauth_required` it opens the dialog and, after a successful
 * re-verify, runs the action again. Resolves with the final result, or null if cancelled.
 */
export function useReverify(): {
  guard: <T extends Guardable>(action: ReverifyAction, run: () => Promise<T>) => Promise<T | null>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<{
    action: ReverifyAction;
    retry: () => void;
    cancel: () => void;
  } | null>(null);

  const guard = useCallback(
    async <T extends Guardable>(action: ReverifyAction, run: () => Promise<T>) => {
      const first = await run();
      if (first.ok || first.error !== "reauth_required") return first;
      return new Promise<T | null>((resolve) => {
        setPending({
          action,
          retry: () => {
            setPending(null);
            void run().then(resolve);
          },
          cancel: () => {
            setPending(null);
            resolve(null);
          },
        });
      });
    },
    [],
  );

  const dialog = pending ? (
    <ReverifyDialog action={pending.action} onDone={pending.retry} onCancel={pending.cancel} />
  ) : null;
  return { guard, dialog };
}
