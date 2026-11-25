"use client";

import {
  CalendarCheck,
  CircleUserRound,
  House,
  Pill,
  Search,
  Store,
  Stethoscope,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@acurexpress/ui";

type NavKey =
  "home" | "doctors" | "consult" | "shops" | "account" | "findCare" | "appointments" | "medicines";

const publicItems: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: "home", href: "/", icon: House },
  { key: "doctors", href: "/doctors", icon: Stethoscope },
  { key: "consult", href: "/consult", icon: Video },
  { key: "shops", href: "/shops", icon: Store },
  { key: "account", href: "/account", icon: CircleUserRound },
];

/** Signed-in tabs (docs/specs/signed-in-home.md item 57; proposed §25 change). */
const patientItems: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: "home", href: "/", icon: House },
  { key: "findCare", href: "/doctors", icon: Search },
  { key: "appointments", href: "/appointments", icon: CalendarCheck },
  { key: "medicines", href: "/medicines", icon: Pill },
  { key: "shops", href: "/shops", icon: Store },
  { key: "account", href: "/account", icon: CircleUserRound },
];

/**
 * Bottom tab bar on small screens only, with safe-area padding and 44px+ targets. Shops follows
 * the shop-network flag; Medicines (signed-in tabs) follows the medicine-sales flag, hidden when off.
 */
export function MobileBottomNav({
  showShops,
  showMedicines = false,
  variant = "public",
}: {
  showShops: boolean;
  showMedicines?: boolean;
  variant?: "public" | "patient";
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = variant === "patient" ? patientItems : publicItems;
  const visible = items.filter(
    (item) => (item.key !== "shops" || showShops) && (item.key !== "medicines" || showMedicines),
  );

  return (
    <nav
      aria-label={t("bottomLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {visible.map(({ key, href, icon: Icon }) => {
          const current =
            href === "/" ? pathname === "/" || pathname === "/home" : pathname.startsWith(href);
          return (
            <li key={key} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-[13px] leading-tight",
                  current ? "font-semibold text-brand-blue" : "text-body",
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={current ? 2.5 : 2} />
                <span className="max-w-full truncate">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
