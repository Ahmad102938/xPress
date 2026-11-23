"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@acurexpress/ui";
import { locationLabel, useLocation } from "@/features/location/location-provider";

/**
 * Header location (Apollo-style). Desktop: pin, "Deliver to" and the place. Phones: one line
 * "Deliver to Bhopal 462001", truncated with an ellipsis when space runs out. Opens the
 * "Deliver to" sheet (rendered once, by LocationSheetLazy in the site shell).
 */
export function LocationPicker({
  variant,
  className,
}: {
  variant: "desktop" | "mobile";
  className?: string;
}) {
  const t = useTranslations("location");
  const { location, open } = useLocation();
  const label = locationLabel(location);

  return (
    <>
      {variant === "desktop" ? (
        <button
          type="button"
          onClick={open}
          className={cn(
            "inline-flex min-h-11 max-w-56 cursor-pointer items-center gap-2 rounded-lg px-2 text-left hover:bg-tint-blue",
            className,
          )}
        >
          <MapPin aria-hidden="true" className="size-5 shrink-0 text-brand-blue" />
          <span className="min-w-0">
            <span className="block text-[13px] leading-tight text-body">{t("title")}</span>{" "}
            <span className="flex items-center gap-1 text-sm leading-tight font-semibold text-ink">
              <span className="truncate">{label}</span>
              <span className="sr-only">, {t("change")}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          className={cn(
            "flex min-h-11 min-w-0 cursor-pointer flex-col justify-center text-left",
            className,
          )}
        >
          <span className="text-[13px] leading-tight text-body">{t("title")}</span>{" "}
          <span className="flex min-w-0 items-center gap-1 text-sm leading-tight font-semibold text-ink">
            <span className="truncate">{label}</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </span>
          <span className="sr-only">, {t("change")}</span>
        </button>
      )}
    </>
  );
}
