"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { fullNameSchema } from "@acurexpress/core";
import { Link } from "@/i18n/navigation";
import { ErrorNotice, inputClass, SubmitButton, type ErrorKey } from "./panel-ui";

/**
 * Finish sign-up (consent gate, docs/specs/auth.md G4): the required 18+ and Terms box, the optional
 * marketing box (both unticked) and the name. TODO_HCQ: the legal wording and the Terms and Privacy
 * pages are placeholders until HCQ supplies the real documents.
 */
export function FinishSignupStep({
  onSubmit,
  pending,
  error,
  defaultName = "",
}: {
  onSubmit: (input: { fullName: string; marketing: boolean; acceptTerms: boolean }) => void;
  pending: boolean;
  error: ErrorKey | null;
  defaultName?: string;
}) {
  const t = useTranslations("auth.finish");
  const tPending = useTranslations("auth.pending");
  const id = useId();
  const [name, setName] = useState(defaultName);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [nameError, setNameError] = useState<ErrorKey | null>(null);

  function validateName(): string | null {
    const parsed = fullNameSchema.safeParse(name);
    setNameError(parsed.success ? null : "invalid_name");
    return parsed.success ? parsed.data : null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const fullName = validateName();
    if (!fullName || !terms) return;
    onSubmit({ fullName, marketing, acceptTerms: true });
  }

  const legalLink = (href: "/terms" | "/privacy") =>
    function LegalLink(chunks: React.ReactNode) {
      return (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-blue underline underline-offset-2"
        >
          {chunks}
          <span className="sr-only"> {t("newTab")}</span>
        </Link>
      );
    };

  return (
    <form onSubmit={submit} noValidate className="mt-6">
      <label htmlFor={`${id}-name`} className="block text-sm font-semibold text-ink">
        {t("nameLabel")}
      </label>
      <p id={`${id}-name-hint`} className="text-sm text-body">
        {t("nameHint")}
      </p>
      <input
        id={`${id}-name`}
        name="fullName"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (nameError) setNameError(null);
        }}
        onBlur={() => name && validateName()}
        aria-invalid={nameError ? true : undefined}
        aria-describedby={`${id}-name-hint ${id}-name-error`}
        className={`${inputClass} mt-1`}
      />
      <ErrorNotice id={`${id}-name-error`} error={nameError} />

      <div className="mt-5 flex items-start gap-3">
        <input
          id={`${id}-terms`}
          type="checkbox"
          required
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-brand-blue"
        />
        <label htmlFor={`${id}-terms`} className="cursor-pointer text-sm text-ink">
          {t.rich("terms", { terms: legalLink("/terms"), privacy: legalLink("/privacy") })}
        </label>
      </div>
      <div className="mt-3 flex items-start gap-3">
        <input
          id={`${id}-marketing`}
          type="checkbox"
          checked={marketing}
          onChange={(event) => setMarketing(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-brand-blue"
        />
        <label htmlFor={`${id}-marketing`} className="cursor-pointer text-sm text-body">
          {t("marketing")}
        </label>
      </div>

      <ErrorNotice error={error} />
      <SubmitButton pending={pending} pendingLabel={tPending("saving")} disabled={!terms}>
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
