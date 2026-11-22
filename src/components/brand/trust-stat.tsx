import type { LucideIcon } from "lucide-react";

interface TrustStatProps {
  icon: LucideIcon;
  value: string | null;
  label: string;
  detail?: string;
  /** Marks placeholder figures in the DOM for audits (hard rule 7). */
  isPlaceholder?: boolean;
}

export function TrustStat({ icon: Icon, value, label, detail, isPlaceholder }: TrustStatProps) {
  return (
    <div className="flex items-center gap-3" data-placeholder={isPlaceholder || undefined}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-green">
        <Icon aria-hidden="true" className="size-5 text-brand-green" />
      </span>
      <p className="min-w-0 leading-tight">
        {value && <span className="block text-lg font-bold text-ink">{value}</span>}
        <span className={value ? "text-sm text-body" : "block text-sm font-semibold text-ink"}>
          {label}
        </span>
        {detail && <span className="block text-[13px] text-muted">{detail}</span>}
      </p>
    </div>
  );
}
