import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Static location chip. Uses the native `popover` attribute: no JavaScript, Escape and
 * light-dismiss built in. TODO(location): city/PIN search and "use my location" (with permission).
 */
export function LocationPicker({ id, className }: { id: string; className?: string }) {
  const t = useTranslations("header");
  const popoverId = `${id}-popover`;
  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label={t("chooseLocation")}
        className={cn(
          "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg border border-line bg-panel px-2 text-sm text-ink hover:border-brand-blue",
          className,
        )}
      >
        <MapPin aria-hidden="true" className="size-5 shrink-0 text-brand-blue" />
        <span className="hidden max-w-40 truncate lg:inline">{t("chooseLocation")}</span>
      </button>
      <div
        id={popoverId}
        popover="auto"
        role="dialog"
        aria-labelledby={`${popoverId}-title`}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-panel p-4 text-body shadow-xl backdrop:bg-ink/40"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={`${popoverId}-title`} className="text-lg font-bold">
            {t("locationDialogTitle")}
          </h2>
          <button
            type="button"
            popoverTarget={popoverId}
            popoverTargetAction="hide"
            aria-label={t("locationClose")}
            className="-mt-2 -mr-2 flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-page"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <label htmlFor={`${popoverId}-input`} className="mt-2 block text-sm font-medium text-ink">
          {t("locationLabel")}
        </label>
        <input
          id={`${popoverId}-input`}
          type="text"
          inputMode="text"
          autoComplete="postal-code"
          placeholder={t("locationPlaceholder")}
          className="mt-1 h-11 w-full rounded-md border border-input px-3 text-base text-ink placeholder:text-muted"
        />
        <p className="mt-2 text-sm text-body">{t("locationNote")}</p>
      </div>
    </>
  );
}
