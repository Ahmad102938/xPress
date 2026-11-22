import { Logo } from "@acurexpress/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Same bar as the patient site header (apps/web): white panel, bottom rule, logo on the left. */
export function PartnerHeader() {
  const t = useTranslations("header");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md">
          <Logo className="shrink-0" />
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold text-brand-blue hover:bg-tint-blue"
        >
          {t("login")}
        </Link>
      </div>
    </header>
  );
}
