import { cn } from "@/lib/utils";

/**
 * A-CureXpress wordmark. TODO(brand): replace with the official logo files from HCQ Care.
 * Decorative mark + text, so the brand name is real text for screen readers and translation.
 */
export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <svg aria-hidden="true" viewBox="0 0 64 64" className="size-7 shrink-0">
        <rect width="64" height="64" rx="14" fill={tone === "light" ? "#ffffff" : "#155DFC"} />
        <rect
          x="26"
          y="12"
          width="12"
          height="40"
          rx="3"
          fill={tone === "light" ? "#155DFC" : "#ffffff"}
        />
        <rect
          x="12"
          y="26"
          width="40"
          height="12"
          rx="3"
          fill={tone === "light" ? "#155DFC" : "#ffffff"}
        />
        <circle cx="46" cy="46" r="8" fill="#22C55E" />
      </svg>
      <span
        className={cn(
          "text-lg leading-none font-extrabold tracking-tight whitespace-nowrap",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        A-Cure<span className={tone === "light" ? "text-white" : "text-brand-green"}>X</span>press
      </span>
    </span>
  );
}
