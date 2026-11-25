import { getTranslations } from "next-intl/server";
import { Button } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";

/** The same page for "does not exist" and "not yours" (no hint either way). */
export default async function AppointmentNotFound() {
  const t = await getTranslations("appointments");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="panel border border-line p-6">
        <h1 className="text-xl font-bold text-ink">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-body">{t("notFoundBody")}</p>
        <Button asChild className="mt-4">
          <Link href="/appointments">{t("back")}</Link>
        </Button>
      </div>
    </div>
  );
}
