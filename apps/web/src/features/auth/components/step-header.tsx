"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SheetClose, SheetDescription, SheetTitle } from "@acurexpress/ui";

/**
 * Top of every step: back and close controls, a small illustration (a phone and a calendar, no
 * claims; N10), the title and the subtitle. In the drawer the title is the dialog's accessible name.
 */
export function StepHeader({
  variant,
  title,
  subtitle,
  onBack,
}: {
  variant: "drawer" | "page";
  title: string;
  subtitle?: string;
  onBack?: (() => void) | undefined;
}) {
  const t = useTranslations("auth");
  const Title = variant === "drawer" ? SheetTitle : "h1";
  const Description = variant === "drawer" ? SheetDescription : "p";

  return (
    <div>
      <div className="flex min-h-11 items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("back")}
            className="-ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-tint-blue"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {variant === "drawer" ? (
          <SheetClose
            aria-label={t("close")}
            className="-mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-tint-blue"
          >
            <X aria-hidden="true" className="size-5" />
          </SheetClose>
        ) : null}
      </div>
      <PanelIllustration />
      <Title className="mt-4 text-center text-2xl font-bold text-ink">{title}</Title>
      {subtitle ? (
        <Description className="mt-1 text-center text-sm text-body">{subtitle}</Description>
      ) : variant === "drawer" ? (
        <SheetDescription className="sr-only">{t("panelTitle")}</SheetDescription>
      ) : null}
    </div>
  );
}

/** Decorative only: a phone showing a code, beside a calendar. Brand tokens, no text. */
function PanelIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 140"
      className="mx-auto mt-2 h-32 w-auto"
      role="presentation"
    >
      <circle cx="120" cy="72" r="64" fill="var(--color-tint-blue)" />
      <rect
        x="78"
        y="22"
        width="56"
        height="100"
        rx="10"
        fill="var(--color-panel)"
        stroke="var(--color-deep-blue)"
        strokeWidth="3"
      />
      <rect x="86" y="36" width="40" height="64" rx="4" fill="var(--color-tint-blue)" />
      <g fill="var(--color-brand-blue)">
        <rect x="90" y="62" width="7" height="10" rx="2" />
        <rect x="99" y="62" width="7" height="10" rx="2" />
        <rect x="108" y="62" width="7" height="10" rx="2" />
        <rect x="117" y="62" width="7" height="10" rx="2" />
      </g>
      <circle cx="106" cy="111" r="4" fill="var(--color-deep-blue)" />
      <rect
        x="142"
        y="52"
        width="58"
        height="54"
        rx="8"
        fill="var(--color-panel)"
        stroke="var(--color-brand-green)"
        strokeWidth="3"
      />
      <rect x="142" y="52" width="58" height="14" rx="6" fill="var(--color-brand-green)" />
      <path
        d="M158 84l8 8 16-16"
        fill="none"
        stroke="var(--color-brand-green)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 40h16M48 32v16M190 24h12M196 18v12"
        stroke="var(--color-teal)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
