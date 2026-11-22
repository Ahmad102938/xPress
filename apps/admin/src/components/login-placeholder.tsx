import { useTranslations } from "next-intl";

/**
 * Admin sign-in placeholder.
 *
 * TODO(auth): MFA is REQUIRED for every admin and staff account (Product Context: "email plus
 * TOTP MFA for staff and admins"). Do not ship any admin page until sign-in enforces TOTP MFA
 * server-side (Supabase Auth AAL2 checked in the proxy and in every server action), with a
 * server-side role guard and access logging.
 */
export function LoginPlaceholder() {
  const t = useTranslations("login");
  return (
    <div className="panel p-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-body">{t("body")}</p>
      <p className="mt-4 rounded-md bg-tint-blue px-3 py-2 text-sm font-semibold text-deep-blue">
        {t("mfaNote")}
      </p>
    </div>
  );
}
