import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  /** 0 to 5. */
  rating: number;
  count?: number;
  className?: string;
}

/**
 * Star rating with the number written out, so the value never depends on colour or icons.
 * Stars are decorative (aria-hidden); the accessible name comes from the text.
 */
export function RatingStars({ rating, count, className }: RatingStarsProps) {
  const t = useTranslations("rating");
  const clamped = Math.min(5, Math.max(0, rating));
  const value = clamped.toFixed(1);
  const fillPercent = (clamped / 5) * 100;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className="sr-only">{t("label", { rating: value })}</span>
      <span aria-hidden="true" className="relative inline-flex">
        <span className="flex text-line">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-4" fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-star"
          style={{ width: `${fillPercent}%` }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-4 shrink-0" fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </span>
      <span aria-hidden="true" className="font-semibold text-ink">
        {value}
      </span>
      {count !== undefined && <span className="text-muted">{t("count", { count })}</span>}
    </span>
  );
}
