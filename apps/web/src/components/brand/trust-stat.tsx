import type { LucideIcon } from "lucide-react";

interface TrustStatProps {
  icon: LucideIcon;
  value: string | null;
  label: string;
  detail?: string;
  /** Solid icon circle colour. */
  tone?: "blue" | "green" | "amber" | "navy";
  /** Marks placeholder figures in the DOM for audits (hard rule 7). */
  isPlaceholder?: boolean;
}

const tones = {
  blue: "bg-brand-blue text-white",
  green: "bg-brand-green text-white",
  amber: "bg-amber text-on-amber",
  navy: "bg-deep-blue text-white",
};

export function TrustStat({
  icon: Icon,
  value,
  label,
  detail,
  tone = "green",
  isPlaceholder,
}: TrustStatProps) {
  return (
    <div className="flex items-center gap-3" data-placeholder={isPlaceholder || undefined}>
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm ${tones[tone]}`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="min-w-0 leading-tight">
        {value && <span className="block text-xl font-extrabold text-deep-blue">{value}</span>}
        <span className={value ? "text-sm text-body" : "block text-[15px] font-bold text-ink"}>
          {label}
        </span>
        {detail && <span className="block text-[13px] text-body">{detail}</span>}
      </p>
    </div>
  );
}
