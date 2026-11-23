"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { normalizeIndianPhone } from "@acurexpress/core";
import { ErrorNotice, inputClass, SubmitButton, type ErrorKey } from "./panel-ui";

/** Phone step: +91 prefix, numeric keypad, blur-first validation (docs/specs/auth.md item 41). */
export function PhoneStep({
  onSubmit,
  pending,
  error,
  defaultValue = "",
  children,
}: {
  onSubmit: (normalized: string) => void;
  pending: boolean;
  error: ErrorKey | null;
  defaultValue?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("auth.phone");
  const tPending = useTranslations("auth.pending");
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [localError, setLocalError] = useState<ErrorKey | null>(null);

  function validate(): string | null {
    const normalized = normalizeIndianPhone(value);
    setLocalError(normalized ? null : "invalid_phone");
    return normalized;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = validate();
    if (normalized) onSubmit(normalized);
  }

  const shown = localError ?? error;
  return (
    <form onSubmit={submit} noValidate className="mt-6">
      <label htmlFor={`${id}-phone`} className="block text-sm font-semibold text-ink">
        {t("label")}
      </label>
      <div className="mt-1 flex items-stretch rounded-md">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-page px-3 text-base font-semibold text-ink">
          {t("prefix")}
        </span>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={t("placeholder")}
          maxLength={14}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (localError) setLocalError(null);
          }}
          onBlur={() => value && validate()}
          aria-invalid={shown ? true : undefined}
          aria-describedby={`${id}-error`}
          className={`${inputClass} rounded-l-none`}
        />
      </div>
      <ErrorNotice id={`${id}-error`} error={shown} />
      {children}
      <SubmitButton pending={pending} pendingLabel={tPending("sending")}>
        {t("continue")}
      </SubmitButton>
    </form>
  );
}
