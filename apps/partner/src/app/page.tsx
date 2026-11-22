import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { JoinCards } from "@/components/join-cards";

/** The partner landing page is the only indexable page on partners.acurexpress.com. */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function PartnerLandingPage() {
  const t = useTranslations("landing");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <h1 className="max-w-3xl text-2xl leading-tight font-extrabold md:text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-body">{t("intro")}</p>
      <div className="mt-8">
        <JoinCards />
      </div>
    </div>
  );
}
