import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  // Inherits robots: noindex from the root layout.
  return { title: t("metaTitle") };
}

/** Placeholder. TODO(auth): partner sign-in lands with the auth work. */
export default function PartnerLoginPage() {
  const t = useTranslations("login");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="panel p-6">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-2 text-body">{t("body")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-blue underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
