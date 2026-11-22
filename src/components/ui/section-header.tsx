import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle?: string;
  /** When set, shows a "View all" link. */
  viewAllHref?: ComponentProps<typeof Link>["href"];
  className?: string;
}

/** Panel heading with an optional "View all" link. `id` labels the section via aria-labelledby. */
export function SectionHeader({ id, title, subtitle, viewAllHref, className }: SectionHeaderProps) {
  const t = useTranslations("common");
  // The link's name stays the visible "View all" (WCAG 2.5.3 label in name); the section title is
  // added as its description so screen reader users know which list it opens.
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg leading-tight font-bold md:text-xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          aria-describedby={id}
          className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md px-2 text-sm font-semibold text-brand-blue hover:underline"
        >
          {t("viewAll")}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}
