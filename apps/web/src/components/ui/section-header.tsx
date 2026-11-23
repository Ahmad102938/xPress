import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@acurexpress/ui";

const accents = {
  blue: "bg-brand-blue",
  green: "bg-brand-green",
  amber: "bg-amber",
  navy: "bg-deep-blue",
} as const;

interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle?: string;
  /** Colour of the small bar before the title (decorative). */
  accent?: keyof typeof accents;
  /** When set, shows a "View all" link. */
  viewAllHref?: ComponentProps<typeof Link>["href"];
  className?: string;
}

/** Section heading with a small accent bar and an optional "View all" link. `id` labels the section. */
export function SectionHeader({
  id,
  title,
  subtitle,
  accent = "blue",
  viewAllHref,
  className,
}: SectionHeaderProps) {
  const t = useTranslations("common");
  // The link's name stays the visible "View all" (WCAG 2.5.3 label in name); the section title is
  // added as its description so screen reader users know which list it opens.
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3 md:mb-4", className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2.5 text-lg leading-tight font-extrabold text-balance md:text-xl"
        >
          <span
            aria-hidden="true"
            className={cn("h-5 w-1.5 shrink-0 rounded-full", accents[accent])}
          />
          {title}
        </h2>
        {subtitle && <p className="mt-1 pl-4 text-sm text-body">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          aria-describedby={id}
          className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-3 text-sm font-semibold text-brand-blue hover:bg-tint-blue"
        >
          {t("viewAll")}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}
