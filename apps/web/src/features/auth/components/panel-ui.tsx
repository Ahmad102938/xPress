"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, cn } from "@acurexpress/ui";
import type messages from "@/i18n/messages/en.json";

/** Shared bits for the sign-in steps: the error notice and the full-width submit button. */

export type ErrorKey = string;
type ErrorMessageKey = keyof (typeof messages)["auth"]["errors"];

/** Announced to screen readers; never relies on colour alone (icon-free text plus a border). */
export function ErrorNotice({ id, error }: { id?: string; error: ErrorKey | null }) {
  const t = useTranslations("auth.errors");
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className={cn(
        "text-sm",
        error ? "mt-3 rounded-md border border-error bg-panel p-3 text-error" : "sr-only",
      )}
    >
      {error
        ? t.has(error as ErrorMessageKey)
          ? t(error as ErrorMessageKey)
          : t("unavailable")
        : ""}
    </p>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="mt-4 w-full"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export const inputClass =
  "h-12 w-full rounded-md border border-input bg-panel px-3 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-error";
