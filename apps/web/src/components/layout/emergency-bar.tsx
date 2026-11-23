"use client";

import { Phone, X } from "lucide-react";
import { useState } from "react";
import { EMERGENCY_DISMISSED_KEY } from "@/config/emergency";

/**
 * Slim amber emergency notice (§25, brief p.7). Dismissal lasts for the browser session: an inline
 * script marks <html data-emergency-dismissed> before paint and CSS hides the bar, so a dismissed
 * bar never flashes or shifts the layout on later pages.
 */
export function EmergencyBar({ message, dismissLabel }: { message: string; dismissLabel: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(EMERGENCY_DISMISSED_KEY, "1");
    } catch {
      // Storage blocked (private mode): dismissal lasts for this page only.
    }
    document.documentElement.dataset.emergencyDismissed = "1";
  }

  return (
    <div role="note" data-emergency-bar="" className="bg-amber text-on-amber">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-[13px] leading-[1.35] font-medium">
        <Phone aria-hidden="true" className="size-4 shrink-0" />
        <p className="flex-1 py-2">{message}</p>
        {/* 32px visible button with a 44px hit area (the ::after extends it). */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={dismissLabel}
          className="relative -mr-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md after:absolute after:-inset-1.5 after:content-[''] hover:bg-black/10"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
