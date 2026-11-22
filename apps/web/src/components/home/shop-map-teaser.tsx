import { Info, Map } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Static teaser only: an illustration, not a real map. No map SDK and no shop pins until shops
 * with verified coordinates exist (hard rule 7). Rendered only when the shop network is on.
 */
export function ShopMapTeaser() {
  const t = useTranslations("shopsMap");
  return (
    <section
      aria-labelledby="shops-map-title"
      className="panel grid grid-cols-1 overflow-hidden md:grid-cols-2"
      data-testid="shops-map-section"
    >
      <Image
        src="/images/map-teaser.svg"
        alt={t("imageAlt")}
        width={640}
        height={320}
        className="aspect-2/1 h-auto w-full object-cover"
      />
      <div className="flex flex-col justify-center gap-3 p-4 md:p-6">
        <h2 id="shops-map-title" className="text-lg font-bold md:text-xl">
          {t("title")}
        </h2>
        <p className="text-sm text-body">{t("body")}</p>
        <p className="flex items-start gap-1.5 rounded-md bg-warning-bg p-2 text-[13px] text-warning">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t("stockNote")}
        </p>
        <Button asChild className="w-fit">
          <Link href="/shops">
            <Map aria-hidden="true" />
            {t("cta")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
