import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@acurexpress/db/server";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { Button } from "@acurexpress/ui";
import { getAuthMethods } from "@/config/auth-methods";
import { signOut } from "@/features/auth/actions";
import { ContactActions } from "@/features/auth/components/contact-actions";
import { requirePatient } from "@/features/auth/server/require-patient";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const LINK_RESULTS = new Set([
  "google",
  "in_use_google",
  "cancelled",
  "unavailable",
  "method_disabled",
]);

/** Profile placeholder: name, contacts, add phone/email, connect Google, marketing, logout. */
async function AccountContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/account">["searchParams"];
}) {
  const auth = await requirePatient("/account");
  const t = await getTranslations("account");
  const supabase = await createClient();

  // The user's own rows, read with their session so RLS applies (SUPABASE.md §8 rule 9).
  const [{ data: profile }, { data: marketingRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("granted")
      .eq("consent_type", "marketing")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const link = (await searchParams).link;
  const linkResult = typeof link === "string" && LINK_RESULTS.has(link) ? link : null;
  const providers = new Set((auth.user.identities ?? []).map((identity) => identity.provider));

  return (
    <div className="panel p-6">
      {/* The header menu is hidden on phones, so its links live here too (bottom nav "Account"). */}
      <Link
        href="/appointments"
        className="mb-4 flex min-h-12 items-center gap-3 rounded-lg border border-line px-4 font-semibold text-ink hover:bg-tint-blue"
      >
        <CalendarCheck aria-hidden="true" className="size-5 text-brand-blue" />
        <span className="flex-1">{t("appointmentsLink")}</span>
        <ChevronRight aria-hidden="true" className="size-4 text-muted" />
      </Link>
      <dl>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3">
          <dt className="text-sm font-semibold text-ink">{t("name")}</dt>
          <dd className="text-sm text-body">{profile?.full_name ?? auth.fullName}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <ContactActions
          phone={profile?.phone ?? null}
          email={profile?.email ?? null}
          googleConnected={providers.has("google")}
          googleEnabled={getAuthMethods().includes("google")}
          marketing={marketingRows?.[0]?.granted ?? false}
          initialResult={linkResult}
        />
      </div>
      <form
        action={async () => {
          "use server";
          await signOut("/");
        }}
        className="mt-8"
      >
        <Button type="submit" variant="outline">
          {t("logout")}
        </Button>
      </form>
    </div>
  );
}

export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("account");
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-1 mb-4 text-body">{t("intro")}</p>
      <Suspense fallback={<div className="panel min-h-64" aria-busy="true" />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
