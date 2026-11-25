"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@acurexpress/ui";

/**
 * A home card with an always-visible summary and a details area the patient can expand. Starts
 * collapsed so the card stays one compact row. The toggle is a real button with aria-expanded and
 * aria-controls; the details are removed from the tab order while hidden. No height animation
 * (reduced motion safe, no layout tricks).
 */
export function CollapsibleCard({
  summary,
  details,
  expandLabel,
  collapseLabel,
  labelledBy,
  className,
}: {
  summary: ReactNode;
  details: ReactNode;
  expandLabel: string;
  collapseLabel: string;
  /** Id of the card heading, so the section is named by it. */
  labelledBy: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <section aria-labelledby={labelledBy} className={className}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{summary}</div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-tint-blue"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn("size-5 transition-transform", open && "rotate-180")}
          />
          <span className="sr-only">{open ? collapseLabel : expandLabel}</span>
        </button>
      </div>
      <div id={detailsId} hidden={!open} className="mt-4 border-t border-line pt-4">
        {details}
      </div>
    </section>
  );
}
