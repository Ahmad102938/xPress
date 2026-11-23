"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, Crosshair, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@acurexpress/ui";
import { locationLabel, useLocation, type DetectResult } from "./location-provider";

const PINCODE = /^[1-9]\d{5}$/;

/** "Deliver to" sheet (Apollo pattern): bottom sheet on phones, right drawer from md. */
export function LocationSheet() {
  const t = useTranslations("location");
  const id = useId();
  const { location, isOpen, close, detect, choosePincode } = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pincode, setPincode] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setMessage(null);
    setError(null);
    setPincode("");
  }

  function useCurrent() {
    setError(null);
    setMessage(t("detecting"));
    startTransition(async () => {
      const result: DetectResult = await detect();
      setMessage(null);
      if (result === "ok") {
        reset();
        close();
      } else setError(`detect_${result}`);
    });
  }

  function applyPincode(event: FormEvent) {
    event.preventDefault();
    const value = pincode.trim();
    if (!PINCODE.test(value)) {
      setError("invalid_pincode");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await choosePincode(value);
      if (result === "ok") {
        reset();
        close();
      } else setError(result === "not_found" ? "pincode_not_found" : "unavailable");
    });
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          close();
        }
      }}
    >
      <SheetContent closeLabel={t("close")} hideClose className="h-auto max-h-[90dvh] md:h-dvh">
        <div className="px-5 pt-3 pb-8">
          <div className="flex min-h-11 items-center gap-2">
            <SheetClose
              aria-label={t("close")}
              className="-ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-tint-blue"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </SheetClose>
            <SheetTitle>{t("title")}</SheetTitle>
          </div>
          <SheetDescription className="mt-1">
            {t("current", { place: locationLabel(location) })}
          </SheetDescription>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={useCurrent}
            disabled={pending}
            aria-busy={pending}
          >
            <Crosshair aria-hidden="true" className="size-5" />
            {t("useCurrent")}
          </Button>

          <p className="my-5 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {t("or")}
          </p>

          <form onSubmit={applyPincode} noValidate>
            <label htmlFor={`${id}-pin`} className="block text-sm font-semibold text-ink">
              {t("pincodeLabel")}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={`${id}-pin`}
                name="pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder="462001"
                value={pincode}
                onChange={(event) => {
                  setPincode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                aria-invalid={
                  error === "invalid_pincode" || error === "pincode_not_found" ? true : undefined
                }
                aria-describedby={`${id}-status`}
                className="h-12 min-w-0 flex-1 rounded-md border border-input bg-panel px-3 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-error"
              />
              <Button type="submit" size="lg" variant="outline" disabled={pending}>
                <MapPin aria-hidden="true" className="size-4" />
                {t("apply")}
              </Button>
            </div>
          </form>

          <div id={`${id}-status`} className="mt-3 text-sm" aria-live="polite">
            {message ? <p className="text-body">{message}</p> : null}
            {error ? (
              <p role="alert" className="rounded-md border border-error p-3 text-error">
                {t(`errors.${error}` as "errors.unavailable")}
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
