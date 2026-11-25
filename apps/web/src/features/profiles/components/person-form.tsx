"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DEPENDENT_RELATIONSHIPS,
  PROFILE_GENDERS,
  isMinor,
  type PatientProfileErrorKey,
} from "@acurexpress/core";
import { Button } from "@acurexpress/ui";
import { createDependent, updatePatientProfile } from "../actions";
import type { PatientProfile } from "../server/selected-profile";

const ISSUES = new Set([
  "invalid_name",
  "invalid_date",
  "date_too_old",
  "date_in_future",
  "invalid_relationship",
  "invalid_phone",
  "required",
  "too_long",
]);

/**
 * One form for a person (docs/specs/signed-in-home.md item 40): add a dependent, or edit self or a
 * dependent. Visible labels; errors show after a field loses focus, and clear on change. Adults
 * (18+ by date of birth in IST) need the "I have their permission" box. The profile id is sent
 * explicitly. Nothing here is required beyond what booking needs; no health data is asked.
 */
export function PersonForm({
  profile,
  onSaved,
  onCancel,
}: {
  /** Absent: add a dependent. */
  profile?: PatientProfile;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("family");
  const router = useRouter();
  const id = useId();
  const isSelf = profile?.isSelf ?? false;
  const [dob, setDob] = useState(profile?.dateOfBirth ?? "");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<PatientProfileErrorKey | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const adult = !isSelf && /^\d{4}-\d{2}-\d{2}$/.test(dob) && !isMinor(dob, new Date());
  const wasAdult = Boolean(profile?.dateOfBirth && !isMinor(profile.dateOfBirth, new Date()));
  const needsPermission = adult && !(profile && wasAdult);
  const today = new Date().toISOString().slice(0, 10);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setError(null);
    setIssue(null);
    setSaved(false);
    startTransition(async () => {
      const result = profile
        ? await updatePatientProfile({
            patientProfileId: profile.id,
            fullName: value("fullName"),
            dateOfBirth: value("dateOfBirth"),
            gender: value("gender"),
            consultationLanguage: value("consultationLanguage"),
            ...(isSelf ? {} : { contactPhone: value("contactPhone") }),
            adultPermission: form.get("adultPermission") === "on",
          })
        : await createDependent({
            fullName: value("fullName"),
            dateOfBirth: value("dateOfBirth"),
            relationship: value("relationship"),
            gender: value("gender") || null,
            consultationLanguage: value("consultationLanguage") || null,
            contactPhone: value("contactPhone"),
            adultPermission: form.get("adultPermission") === "on",
          });
      if (result.ok) {
        setSaved(true);
        router.refresh();
        onSaved?.();
      } else {
        setError(result.error);
        if (result.error === "invalid_input" && result.issue && ISSUES.has(result.issue))
          setIssue(result.issue);
      }
    });
  }

  const field = "flex flex-col gap-1";
  const label = "text-sm font-semibold text-ink";
  const input =
    "min-h-11 rounded-lg border border-line bg-panel px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand-blue aria-[invalid=true]:border-error";
  const blur = (name: string) => () => setTouched((value) => ({ ...value, [name]: true }));
  const nameInvalid = touched.fullName && issue === "invalid_name";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <div className={field}>
        <label htmlFor={`${id}-name`} className={label}>
          {t("form.fullName")}
        </label>
        <input
          id={`${id}-name`}
          name="fullName"
          required
          defaultValue={profile?.fullName ?? ""}
          autoComplete="name"
          onBlur={blur("fullName")}
          aria-invalid={nameInvalid || undefined}
          className={input}
        />
      </div>
      <div className={field}>
        <label htmlFor={`${id}-dob`} className={label}>
          {t("form.dateOfBirth")}
        </label>
        <input
          id={`${id}-dob`}
          name="dateOfBirth"
          type="date"
          min="1900-01-01"
          max={today}
          required={!isSelf}
          value={dob}
          onChange={(event) => setDob(event.target.value)}
          className={input}
        />
      </div>
      {profile ? null : (
        <div className={field}>
          <label htmlFor={`${id}-rel`} className={label}>
            {t("form.relationship")}
          </label>
          <select id={`${id}-rel`} name="relationship" required defaultValue="" className={input}>
            <option value="" disabled>
              {t("form.choose")}
            </option>
            {DEPENDENT_RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {t(`relationships.${relationship}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={field}>
        <label htmlFor={`${id}-gender`} className={label}>
          {t("form.gender")}
        </label>
        <select
          id={`${id}-gender`}
          name="gender"
          defaultValue={profile?.gender ?? ""}
          className={input}
        >
          <option value="">{t("form.choose")}</option>
          {PROFILE_GENDERS.map((gender) => (
            <option key={gender} value={gender}>
              {t(`form.genders.${gender}`)}
            </option>
          ))}
        </select>
      </div>
      <div className={field}>
        <label htmlFor={`${id}-lang`} className={label}>
          {t("form.language")}
        </label>
        <select
          id={`${id}-lang`}
          name="consultationLanguage"
          defaultValue={profile?.consultationLanguage ?? ""}
          className={input}
        >
          <option value="">{t("form.noPreference")}</option>
          <option value="en">{t("form.languages.en")}</option>
          <option value="hi">{t("form.languages.hi")}</option>
        </select>
      </div>
      {isSelf ? null : (
        <div className={field}>
          <label htmlFor={`${id}-phone`} className={label}>
            {t("form.contactPhone")}
          </label>
          <input
            id={`${id}-phone`}
            name="contactPhone"
            type="tel"
            inputMode="tel"
            placeholder="+919000000003"
            defaultValue={profile?.contactPhone ?? ""}
            aria-describedby={`${id}-phone-hint`}
            className={input}
          />
          <p id={`${id}-phone-hint`} className="text-xs text-muted">
            {t("form.contactPhoneHint")}
          </p>
        </div>
      )}
      {needsPermission ? (
        <div className="flex items-start gap-3 rounded-lg bg-tint-cream p-3">
          <input
            id={`${id}-perm`}
            name="adultPermission"
            type="checkbox"
            className="mt-0.5 size-6 shrink-0 accent-brand-blue"
            aria-describedby={`${id}-perm-help`}
          />
          <div>
            <label htmlFor={`${id}-perm`} className="text-sm font-semibold text-ink">
              {t("form.adultPermission")}
            </label>
            <p id={`${id}-perm-help`} className="text-xs text-body">
              {t("form.adultHelp")}
            </p>
          </div>
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-error">
          {issue ? t(`issues.${issue}` as "issues.required") : t(`errors.${error}`)}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-ink">
          {t("form.saved")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("form.saving") : t("form.save")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
