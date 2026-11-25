import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAuthMethods } from "@/config/auth-methods";
import { ContactActions } from "@/features/auth/components/contact-actions";
import { SecuritySection } from "@/features/auth/components/security-section";
import { requirePatientContext } from "@/features/auth/server/require-patient";
import { FamilyList } from "@/features/profiles/components/family-list";
import type { Locale } from "@/i18n/routing";
import { Panel, PrivatePage } from "../page-header";

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

/**
 * The login's settings (docs/specs/signed-in-home.md item 42): sign-in methods, security, consent
 * settings and family profiles. Payments and transactions are not rendered in this build (no
 * tables). Person data lives on /profile. Reads use the user's own session (RLS).
 */
async function AccountContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/account">["searchParams"];
}) {
  const { auth, supabase, profiles } = await requirePatientContext("/account");
  const t = await getTranslations("account");
  const tFamily = await getTranslations("family");

  const [{ data: account }, { data: marketingRows }, { data: termsRows }, { data: deletion }] =
    await Promise.all([
      supabase.from("profiles").select("email, phone").eq("id", auth.user.id).maybeSingle(),
      supabase
        .from("consents")
        .select("granted")
        .eq("consent_type", "marketing")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("consents")
        .select("document_version")
        .eq("consent_type", "terms_privacy")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("account_deletion_requests")
        .select("id")
        .eq("status", "requested")
        .maybeSingle(),
    ]);

  const link = (await searchParams).link;
  const linkResult = typeof link === "string" && LINK_RESULTS.has(link) ? link : null;
  const providers = new Set((auth.user.identities ?? []).map((identity) => identity.provider));
  const termsVersion = termsRows?.[0]?.document_version;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <Panel id="methods">
          <ContactActions
            phone={account?.phone ?? null}
            email={account?.email ?? null}
            googleConnected={providers.has("google")}
            googleEnabled={getAuthMethods().includes("google")}
            marketing={marketingRows?.[0]?.granted ?? false}
            initialResult={linkResult}
          />
          {termsVersion ? (
            <p className="mt-4 text-sm text-muted">
              {t("termsVersion", { version: termsVersion })}
            </p>
          ) : null}
        </Panel>
        <Panel id="security">
          <SecuritySection deletionRequested={Boolean(deletion)} />
        </Panel>
      </div>
      <div className="lg:col-span-5">
        <Panel id="family" title={tFamily("title")}>
          <p className="mb-4 text-sm text-body">{tFamily("intro")}</p>
          <FamilyList dependents={profiles.filter((profile) => !profile.isSelf)} />
        </Panel>
      </div>
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
    <PrivatePage title={t("title")} intro={t("intro")}>
      <Suspense fallback={<div className="panel min-h-96 border border-line" aria-busy="true" />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </PrivatePage>
  );
}
