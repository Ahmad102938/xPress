"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { maskEmail, maskPhone, type AuthMethodId } from "@acurexpress/core";
import {
  completeStepUp,
  finishSignup,
  sendEmailOtp,
  sendPhoneOtp,
  sendStepUpEmailOtp,
  signOut,
  startGoogle,
  stepUpOptions,
  verifyOtp,
  verifyStepUpEmail,
  type SendResult,
  type StateResult,
} from "../actions";
import type { PanelStart } from "./auth-provider";
import { EmailStep } from "./email-step";
import { FinishSignupStep } from "./finish-signup-step";
import { GoogleButton } from "./google-button";
import { OtpStep } from "./otp-step";
import type { ErrorKey } from "./panel-ui";
import { PhoneStep } from "./phone-step";
import { StepHeader } from "./step-header";
import { StepUpStep, type StepUpOptions } from "./step-up-step";
import { TurnstileWidget } from "./turnstile-widget";

/**
 * The one sign-in panel (docs/specs/auth.md G2), used in the drawer and on /login.
 * States (R1-M27): idle, sending, code_sent, verifying, the error keys, needs_finish, step_up, success.
 */

type Step =
  | { kind: "phone" }
  | { kind: "email" }
  | { kind: "google_only" }
  | { kind: "none" }
  | { kind: "otp"; channel: "phone" | "email"; destination: string }
  | { kind: "finish" }
  | { kind: "step_up" }
  | { kind: "step_up_otp"; maskedEmail: string };

function firstStep(methods: AuthMethodId[], start: PanelStart): Step {
  if (start === "finish") return { kind: "finish" };
  if (start === "step_up") return { kind: "step_up" };
  if (methods.includes("phone")) return { kind: "phone" };
  if (methods.includes("email")) return { kind: "email" };
  if (methods.includes("google")) return { kind: "google_only" };
  return { kind: "none" };
}

export interface LoginPanelProps {
  variant: "drawer" | "page";
  methods: AuthMethodId[];
  start: PanelStart;
  next: string;
  initialError?: ErrorKey | null;
  /** Shown instead of the methods when the server has no Supabase env. */
  unavailable?: boolean;
  onSignedIn: () => void | Promise<void>;
}

export function LoginPanel({
  variant,
  methods,
  start,
  next,
  initialError = null,
  unavailable = false,
  onSignedIn,
}: LoginPanelProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [step, setStep] = useState<Step>(() => firstStep(methods, start));
  const [error, setError] = useState<ErrorKey | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState<StepUpOptions | null>(null);
  const onToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  const emailEnabled = methods.includes("email");
  const googleEnabled = methods.includes("google");
  const phoneEnabled = methods.includes("phone");

  useEffect(() => {
    if (step.kind !== "step_up" || stepUp) return;
    void stepUpOptions().then((options) => setStepUp({ ...options, emailEnabled, googleEnabled }));
  }, [step.kind, stepUp, emailEnabled, googleEnabled]);

  function errorOf(result: { ok: false; error: string; issue?: string }): ErrorKey {
    return result.error === "invalid_input" && result.issue ? result.issue : result.error;
  }

  function afterState(result: StateResult) {
    if (!result.ok) {
      setError(errorOf(result));
      return;
    }
    setError(null);
    if (result.state === "needs_finish") setStep({ kind: "finish" });
    else if (result.state === "step_up") setStep({ kind: "step_up" });
    else if (result.state === "signed_in") void onSignedIn();
  }

  function send(channel: "phone" | "email", destination: string, resend = false) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const token = captchaToken ?? undefined;
      const result: SendResult =
        channel === "phone"
          ? await sendPhoneOtp({ phone: destination, ...(token ? { captchaToken: token } : {}) })
          : await sendEmailOtp({ email: destination, ...(token ? { captchaToken: token } : {}) });
      if (!result.ok) {
        setError(errorOf(result));
        return;
      }
      if (resend) setNotice(t("otp.resent"));
      setStep({ kind: "otp", channel, destination });
    });
  }

  function google() {
    setError(null);
    startTransition(async () => {
      const result = await startGoogle({ next });
      if (result.ok) window.location.assign(result.url);
      else setError(result.error);
    });
  }

  const alternatives = (current: "phone" | "email") => (
    <div className="mt-6">
      {(current === "phone" ? emailEnabled : phoneEnabled) || googleEnabled ? (
        <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          {t("or")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3">
        {googleEnabled ? <GoogleButton onClick={google} pending={pending} /> : null}
        {current === "phone" && emailEnabled ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep({ kind: "email" });
            }}
            className="min-h-11 cursor-pointer font-semibold text-brand-blue underline-offset-4 hover:underline"
          >
            {t("email.useInstead")}
          </button>
        ) : null}
        {current === "email" && phoneEnabled ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep({ kind: "phone" });
            }}
            className="min-h-11 cursor-pointer font-semibold text-brand-blue underline-offset-4 hover:underline"
          >
            {t("phone.useInstead")}
          </button>
        ) : null}
      </div>
    </div>
  );

  const captcha = <TurnstileWidget onToken={onToken} locale={locale} />;

  if (unavailable) {
    return (
      <div className="px-5 pb-8">
        <StepHeader variant={variant} title={t("panelTitle")} />
        <p
          role="status"
          className="mt-6 rounded-md border border-line bg-page p-4 text-center text-body"
        >
          {t("unavailableNotice")}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8">
      {step.kind === "phone" ? (
        <>
          <StepHeader variant={variant} title={t("phone.title")} subtitle={t("phone.subtitle")} />
          <PhoneStep onSubmit={(phone) => send("phone", phone)} pending={pending} error={error}>
            {captcha}
          </PhoneStep>
          {alternatives("phone")}
        </>
      ) : null}

      {step.kind === "email" ? (
        <>
          <StepHeader
            variant={variant}
            title={t("email.title")}
            subtitle={t("email.subtitle")}
            onBack={
              phoneEnabled
                ? () => {
                    setError(null);
                    setStep({ kind: "phone" });
                  }
                : undefined
            }
          />
          <EmailStep onSubmit={(email) => send("email", email)} pending={pending} error={error}>
            {captcha}
          </EmailStep>
          {alternatives("email")}
        </>
      ) : null}

      {step.kind === "google_only" ? (
        <>
          <StepHeader variant={variant} title={t("panelTitle")} />
          <div className="mt-6">
            <GoogleButton onClick={google} pending={pending} />
          </div>
        </>
      ) : null}

      {step.kind === "none" ? (
        <>
          <StepHeader variant={variant} title={t("panelTitle")} />
          <p
            role="status"
            className="mt-6 rounded-md border border-line bg-page p-4 text-center text-body"
          >
            {t("noMethods")}
          </p>
        </>
      ) : null}

      {step.kind === "otp" ? (
        <>
          <StepHeader
            variant={variant}
            title={t("otp.title")}
            onBack={() => {
              setError(null);
              setStep({ kind: step.channel });
            }}
          />
          <OtpStep
            maskedDestination={
              step.channel === "phone" ? maskPhone(step.destination) : maskEmail(step.destination)
            }
            pending={pending}
            error={error}
            notice={notice}
            onChangeDestination={() => {
              setError(null);
              setStep({ kind: step.channel });
            }}
            onResend={() => send(step.channel, step.destination, true)}
            onVerify={(code) => {
              setError(null);
              startTransition(async () => {
                afterState(
                  await verifyOtp({ channel: step.channel, destination: step.destination, code }),
                );
              });
            }}
          />
        </>
      ) : null}

      {step.kind === "finish" ? (
        <>
          <StepHeader variant={variant} title={t("finish.title")} subtitle={t("finish.subtitle")} />
          <FinishSignupStep
            pending={pending}
            error={error}
            onSubmit={(input) => {
              setError(null);
              startTransition(async () => afterState(await finishSignup(input)));
            }}
          />
        </>
      ) : null}

      {step.kind === "step_up" ? (
        <>
          <StepHeader variant={variant} title={t("stepUp.title")} subtitle={t("stepUp.subtitle")} />
          {stepUp ? (
            <StepUpStep
              options={stepUp}
              pending={pending}
              error={error}
              onSendEmail={() => {
                setError(null);
                startTransition(async () => {
                  const result = await sendStepUpEmailOtp();
                  if (result.ok)
                    setStep({ kind: "step_up_otp", maskedEmail: stepUp.maskedEmail ?? "" });
                  else setError(errorOf(result));
                });
              }}
              onGoogle={google}
              onConfirmOwner={() => {
                setError(null);
                startTransition(async () => afterState(await completeStepUp()));
              }}
              onNotMine={() => startTransition(async () => signOut("/contact"))}
            />
          ) : (
            <p role="status" className="mt-6 text-center text-body">
              {t("pending.verifying")}
            </p>
          )}
        </>
      ) : null}

      {step.kind === "step_up_otp" ? (
        <>
          <StepHeader
            variant={variant}
            title={t("otp.title")}
            onBack={() => {
              setError(null);
              setStep({ kind: "step_up" });
            }}
          />
          <OtpStep
            maskedDestination={step.maskedEmail}
            pending={pending}
            error={error}
            notice={notice}
            onResend={() =>
              startTransition(async () => {
                const result = await sendStepUpEmailOtp();
                if (result.ok) setNotice(t("otp.resent"));
                else setError(errorOf(result));
              })
            }
            onVerify={(code) => {
              setError(null);
              startTransition(async () => afterState(await verifyStepUpEmail({ code })));
            }}
          />
        </>
      ) : null}
    </div>
  );
}
