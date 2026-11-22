import { ChevronRight, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@acurexpress/ui";

interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle?: string;
  /** Small solid icon square before the title. */
  icon?: LucideIcon;
  iconClassName?: string;
  /** When set, shows a "View all" link. */
  viewAllHref?: ComponentProps<typeof Link>["href"];
  className?: string;
}

/** Panel heading with an optional "View all" link. `id` labels the section via aria-labelledby. */
export function SectionHeader({
  id,
  title,
  subtitle,
  icon: Icon,
  iconClassName = "bg-brand-blue text-white",
  viewAllHref,
  className,
}: SectionHeaderProps) {
  const t = useTranslations("common");
  // The link's name stays the visible "View all" (WCAG 2.5.3 label in name); the section title is
  // added as its description so screen reader users know which list it opens.
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-lg leading-tight font-extrabold md:text-xl"
        >
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                iconClassName,
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
          {title}
        </h2>
        {subtitle && (
          <p className={cn("mt-0.5 text-sm text-muted", Icon && "md:pl-10")}>{subtitle}</p>
        )}
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
