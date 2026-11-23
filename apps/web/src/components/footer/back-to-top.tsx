"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Shown only when the page is long enough to need it. Moves focus back to the top of the page. */
export function BackToTop({ label }: { label: string }) {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    const check = () => setNeeded(document.documentElement.scrollHeight > window.innerHeight * 1.5);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!needed) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        // First focusable element is the "Skip to main content" link at the top of the page.
        document.querySelector<HTMLElement>('a[href="#main"]')?.focus({ preventScroll: true });
      }}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/10"
    >
      <ArrowUp aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
