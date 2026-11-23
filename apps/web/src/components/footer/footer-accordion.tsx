"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * One footer link group. Below `md` it is a disclosure (button with aria-expanded, 48px target,
 * closed by default); from `md` up the links are always shown under a plain heading.
 * Native <button>, so Enter and Space work with no extra key handling.
 */
export function FooterAccordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const panelId = `${id}-panel`;

  return (
    <nav aria-labelledby={labelId} className="border-b border-white/15 last:border-b-0 md:border-0">
      <h2 className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between gap-2 text-left text-base font-semibold text-white"
        >
          <span id={labelId}>{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      {/* Each heading exists only at its breakpoint (display: none hides the other from assistive tech). */}
      <h2 className="hidden text-sm font-semibold text-white/70 md:block">{title}</h2>
      <div id={panelId} className={open ? "pb-3 md:pb-0" : "hidden md:block"}>
        {children}
      </div>
    </nav>
  );
}
