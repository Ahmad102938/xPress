"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { emailSchema } from "@acurexpress/core";
import { ErrorNotice, inputClass, SubmitButton, type ErrorKey } from "./panel-ui";

/** Email step: same shape as the phone step. */
export function EmailStep({
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
  const t = useTranslations("auth.email");
  const tPending = useTranslations("auth.pending");
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [localError, setLocalError] = useState<ErrorKey | null>(null);

  function validate(): string | null {
    const parsed = emailSchema.safeParse(value);
    setLocalError(parsed.success ? null : "invalid_email");
    return parsed.success ? parsed.data : null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = validate();
    if (normalized) onSubmit(normalized);
  }

  const shown = localError ?? error;
  return (
    <form onSubmit={submit} noValidate className="mt-6">
      <label htmlFor={`${id}-email`} className="block text-sm font-semibold text-ink">
        {t("label")}
      </label>
      <input
        id={`${id}-email`}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={t("placeholder")}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (localError) setLocalError(null);
        }}
        onBlur={() => value && validate()}
        aria-invalid={shown ? true : undefined}
        aria-describedby={`${id}-error`}
        className={`${inputClass} mt-1`}
      />
      <ErrorNotice id={`${id}-error`} error={shown} />
      {children}
      <SubmitButton pending={pending} pendingLabel={tPending("sending")}>
        {t("continue")}
      </SubmitButton>
    </form>
  );
}
