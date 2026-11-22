"use client";

import { Phone, X } from "lucide-react";
import { useState } from "react";

/**
 * Thin amber emergency notice (§25). Dismissal lasts for this page view only: persisting it
 * would hide the bar after hydration and shift the layout.
 */
export function EmergencyBar({ message, dismissLabel }: { message: string; dismissLabel: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div role="note" className="bg-amber text-on-amber">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-[13px] leading-snug font-medium">
        <Phone aria-hidden="true" className="size-4 shrink-0" />
        <p className="flex-1 py-1.5">{message}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={dismissLabel}
          className="-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-black/10"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
