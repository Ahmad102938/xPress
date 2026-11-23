import { CircleHelp, Handshake, Headset, Map, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { bottomBarLinks } from "@/config/footer-links";
import { Link } from "@/i18n/navigation";
import { BackToTop } from "./back-to-top";

const ICONS: Record<(typeof bottomBarLinks)[number]["key"], LucideIcon> = {
  help: CircleHelp,
  contact: Headset,
  sitemap: Map,
};

const itemClass =
  "inline-flex min-h-11 items-center gap-2 text-sm text-white hover:underline underline-offset-4";

/**
 * One compact row: icon links ("Become a partner" to the partner site, then help, contact,
 * sitemap), the copyright and back to top. The partner link is the only partner content on web
 * (marked data-partner-band); it is hidden when no partner URL is configured.
 */
export function FooterBottomBar({
  year,
  partnerBase,
}: {
  year: number;
  partnerBase: string | null;
}) {
  const t = useTranslations("footer");
  const tPartner = useTranslations("partnerBand");

  return (
    <div className="border-t border-white/15">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t("bottom.label")}>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {partnerBase && (
              <li data-partner-band="">
                <a href={partnerBase} className={itemClass}>
                  <Handshake aria-hidden="true" className="size-4 text-amber" />
                  {tPartner("cta")}
                  <span className="sr-only"> {tPartner("opensPartnerSite")}</span>
                </a>
              </li>
            )}
            {bottomBarLinks.map(({ key, href }) => {
              const Icon = ICONS[key];
              return (
                <li key={key}>
                  <Link href={href} className={itemClass}>
                    <Icon aria-hidden="true" className="size-4 text-amber" />
                    {t(`bottom.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[13px] text-white/85">{t("copyright", { year })}</p>
          <BackToTop label={t("backToTop")} />
        </div>
      </div>
    </div>
  );
}
