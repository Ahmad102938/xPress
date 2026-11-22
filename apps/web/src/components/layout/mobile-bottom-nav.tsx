"use client";

import { CircleUserRound, House, Store, Stethoscope, Video, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@acurexpress/ui";

type NavKey = "home" | "doctors" | "consult" | "shops" | "account";

const items: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: "home", href: "/", icon: House },
  { key: "doctors", href: "/doctors", icon: Stethoscope },
  { key: "consult", href: "/consult", icon: Video },
  { key: "shops", href: "/shops", icon: Store },
  { key: "account", href: "/account", icon: CircleUserRound },
];

/** Bottom tab bar on small screens only. Shops tab follows the shop-network flag. */
export function MobileBottomNav({ showShops }: { showShops: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const visible = items.filter((item) => item.key !== "shops" || showShops);

  return (
    <nav
      aria-label={t("bottomLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {visible.map(({ key, href, icon: Icon }) => {
          const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px]",
                  current ? "font-semibold text-brand-blue" : "text-body",
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={current ? 2.5 : 2} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
