import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientContext } from "@/features/auth/server/require-patient";
import { AddressManager, type AddressView } from "@/features/profiles/components/address-manager";
import { PersonForm } from "@/features/profiles/components/person-form";
import { ProfileAvatar } from "@/features/profiles/components/profile-avatar";
import type { Locale } from "@/i18n/routing";
import { Panel, PrivatePage } from "../page-header";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "profile" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** One person's data: the selected patient profile and its addresses (docs/specs/signed-in-home.md item 41). */
async function ProfileContent() {
  const { supabase, selected } = await requirePatientContext("/profile");
  const t = await getTranslations("profile");
  const tFamily = await getTranslations("family");
  if (!selected)
    return (
      <Panel>
        <p className="text-body">{t("noAddresses")}</p>
      </Panel>
    );
  const { profile, fellBack } = selected;
  const { data } = await supabase
    .from("patient_addresses")
    .select("id, label, line1, line2, landmark, city, state, pincode, is_default")
    .eq("patient_profile_id", profile.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  const addresses: AddressView[] = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  }));

  return (
    <>
      {fellBack ? (
        <p
          role="status"
          className="rounded-xl border border-line bg-tint-cream px-4 py-3 text-sm text-ink"
        >
          {t("fallbackNotice")}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <ProfileAvatar name={profile.fullName} className="size-14 text-lg" />
        <div>
          <p className="text-lg font-semibold text-ink">
            {t("viewing", { name: profile.fullName })}
          </p>
          {/* text-body: muted grey is below 4.5:1 on the grey page background. */}
          <p className="text-sm text-body">
            {profile.isSelf ? tFamily("self") : tFamily(`relationships.${profile.relationship}`)}
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel id="details" title={t("details")}>
            <PersonForm key={profile.id} profile={profile} />
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Panel id="addresses" title={t("addresses")}>
            <AddressManager key={profile.id} patientProfileId={profile.id} addresses={addresses} />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("profile");
  return (
    <PrivatePage title={t("title")} intro={t("intro")}>
      <Suspense fallback={<div className="panel min-h-96 border border-line" aria-busy="true" />}>
        <ProfileContent />
      </Suspense>
    </PrivatePage>
  );
}
