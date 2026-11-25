"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { emailSchema, maskEmail, maskPhone, normalizeIndianPhone } from "@acurexpress/core";
import { Button } from "@acurexpress/ui";
import {
  addEmail,
  addPhone,
  connectGoogle,
  setMarketing,
  verifyAddEmail,
  verifyAddPhone,
} from "../actions";
import { ErrorNotice, inputClass, type ErrorKey } from "./panel-ui";
import { useReverify } from "./reverify-dialog";

/**
 * Sign-in methods (docs/specs/auth.md Part C, CUJ 6-8; signed-in-home item 43): add or change a
 * phone or email, connect Google, and the marketing choice. "Already in use" appears before any
 * code (accepted). Contacts are shown masked. Each change needs a recent sign-in: when the server
 * answers `reauth_required`, the re-verify dialog opens and the step is retried.
 */

type Editing =
  | { kind: "none" }
  | { kind: "phone"; stage: "enter" | "code"; value: string }
  | { kind: "email"; stage: "enter" | "code"; value: string };

export interface ContactActionsProps {
  phone: string | null;
  email: string | null;
  googleConnected: boolean;
  googleEnabled: boolean;
  marketing: boolean;
  /** `?link=` result from the Google callback. */
  initialResult: string | null;
}

const RESULT_SUCCESS = new Set(["added_phone", "added_email", "google"]);

export function ContactActions(props: ContactActionsProps) {
  const t = useTranslations("account");
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState<Editing>({ kind: "none" });
  const [error, setError] = useState<ErrorKey | null>(
    props.initialResult && !RESULT_SUCCESS.has(props.initialResult) ? props.initialResult : null,
  );
  const [result, setResult] = useState<string | null>(
    props.initialResult && RESULT_SUCCESS.has(props.initialResult) ? props.initialResult : null,
  );
  const [marketing, setMarketingState] = useState(props.marketing);
  const [marketingSaved, setMarketingSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const { guard, dialog } = useReverify();

  function begin(kind: "phone" | "email") {
    setError(null);
    setResult(null);
    setEditing({ kind, stage: "enter", value: "" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing.kind === "none") return;
    const form = new FormData(event.currentTarget);
    setError(null);

    if (editing.stage === "enter") {
      const raw = String(form.get("value") ?? "");
      const value =
        editing.kind === "phone"
          ? normalizeIndianPhone(raw)
          : (emailSchema.safeParse(raw).data ?? null);
      if (!value) {
        setError(editing.kind === "phone" ? "invalid_phone" : "invalid_email");
        return;
      }
      const action =
        editing.kind === "phone"
          ? props.phone
            ? "change_phone"
            : "add_phone"
          : props.email
            ? "change_email"
            : "add_email";
      startTransition(async () => {
        const response = await guard(action, () =>
          editing.kind === "phone" ? addPhone({ phone: value }) : addEmail({ email: value }),
        );
        if (!response) return;
        if (!response.ok)
          setError(
            response.error === "invalid_input" && response.issue ? response.issue : response.error,
          );
        else setEditing({ kind: editing.kind, stage: "code", value });
      });
      return;
    }

    const code = String(form.get("code") ?? "").replace(/\D/g, "");
    const verifyAction =
      editing.kind === "phone"
        ? props.phone
          ? "change_phone"
          : "add_phone"
        : props.email
          ? "change_email"
          : "add_email";
    startTransition(async () => {
      const response = await guard(verifyAction, () =>
        editing.kind === "phone"
          ? verifyAddPhone({ phone: editing.value, code })
          : verifyAddEmail({ email: editing.value, code }),
      );
      if (!response) return;
      if (!response.ok) {
        setError(
          response.error === "invalid_input" && response.issue ? response.issue : response.error,
        );
        return;
      }
      setResult(editing.kind === "phone" ? "added_phone" : "added_email");
      setEditing({ kind: "none" });
      router.refresh();
    });
  }

  function google() {
    setError(null);
    startTransition(async () => {
      const response = await guard("connect_google", () => connectGoogle());
      if (!response) return;
      if (response.ok) window.location.assign(response.url);
      else setError(response.error);
    });
  }

  function toggleMarketing(next: boolean) {
    setMarketingState(next);
    setMarketingSaved(false);
    startTransition(async () => {
      const response = await setMarketing({ granted: next });
      if (response.ok) setMarketingSaved(true);
      else {
        setMarketingState(!next);
        setError(response.error);
      }
    });
  }

  const row = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-3";

  return (
    <div>
      {dialog}
      <h2 className="text-lg font-bold text-ink">{t("sectionMethods")}</h2>
      <dl className="mt-2">
        <div className={row}>
          <dt className="text-sm font-semibold text-ink">{t("phone")}</dt>
          <dd className="flex items-center gap-2 text-sm text-body">
            {props.phone ? maskPhone(props.phone) : t("notAdded")}
            {editing.kind === "none" ? (
              <Button size="sm" variant="outline" onClick={() => begin("phone")}>
                {props.phone ? t("change") : t("addPhone")}
              </Button>
            ) : null}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-sm font-semibold text-ink">{t("email")}</dt>
          <dd className="flex items-center gap-2 text-sm text-body">
            {props.email ? maskEmail(props.email) : t("notAdded")}
            {editing.kind === "none" ? (
              <Button size="sm" variant="outline" onClick={() => begin("email")}>
                {props.email ? t("change") : t("addEmail")}
              </Button>
            ) : null}
          </dd>
        </div>
        {props.googleEnabled || props.googleConnected ? (
          <div className={row}>
            <dt className="text-sm font-semibold text-ink">{t("google")}</dt>
            <dd className="flex items-center gap-2 text-sm text-body">
              {props.googleConnected ? t("connected") : t("notConnected")}
              {!props.googleConnected && props.googleEnabled ? (
                <Button size="sm" variant="outline" onClick={google} disabled={pending}>
                  {t("connectGoogle")}
                </Button>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {editing.kind !== "none" ? (
        <form onSubmit={submit} noValidate className="mt-4 rounded-lg border border-line p-4">
          {editing.stage === "enter" ? (
            <>
              <label htmlFor={`${id}-value`} className="block text-sm font-semibold text-ink">
                {editing.kind === "phone" ? t("phone") : t("email")}
              </label>
              <input
                id={`${id}-value`}
                name="value"
                type={editing.kind === "phone" ? "tel" : "email"}
                inputMode={editing.kind === "phone" ? "numeric" : "email"}
                autoComplete={editing.kind === "phone" ? "tel-national" : "email"}
                className={`${inputClass} mt-1`}
                aria-describedby={`${id}-error`}
              />
            </>
          ) : (
            <>
              <label htmlFor={`${id}-code`} className="block text-sm font-semibold text-ink">
                {t("codeSent", {
                  destination:
                    editing.kind === "phone" ? maskPhone(editing.value) : maskEmail(editing.value),
                })}
              </label>
              <input
                id={`${id}-code`}
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={`${inputClass} mt-1 text-center font-mono tracking-[0.5em]`}
                aria-describedby={`${id}-error`}
              />
            </>
          )}
          <ErrorNotice id={`${id}-error`} error={error} />
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {editing.stage === "enter" ? t("sendCode") : t("verify")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing({ kind: "none" });
                setError(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <ErrorNotice error={error} />
      )}

      {result ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-brand-green bg-tint-green p-3 text-sm text-green-ink"
        >
          {t(`results.${result}` as "results.google")}
        </p>
      ) : null}

      <h2 className="mt-8 text-lg font-bold text-ink">{t("sectionMessages")}</h2>
      <div className="mt-3 flex items-start gap-3">
        <input
          id={`${id}-marketing`}
          type="checkbox"
          checked={marketing}
          disabled={pending}
          onChange={(event) => toggleMarketing(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-brand-blue"
        />
        <label htmlFor={`${id}-marketing`} className="cursor-pointer text-sm text-ink">
          {t("marketing")}
        </label>
      </div>
      {marketingSaved ? (
        <p role="status" className="mt-2 text-sm text-green-ink">
          {t("marketingSaved")}
        </p>
      ) : null}
    </div>
  );
}
