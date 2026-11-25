import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { firstName, getFlags } from "@acurexpress/core";
import { hasSupabaseEnv } from "@acurexpress/db";
import { createClient } from "@acurexpress/db/server";
import { PublicHome } from "@/components/home/public-home";
import { authState } from "@/features/auth/server/auth-state";
import { loginHref } from "@/features/auth/server/require-patient";
import type { HomeContext, HomeSectionId } from "@/features/patient-home/contract";
import { sectionsToRender } from "@/features/patient-home/outline";
import { CompleteProfileCard } from "@/features/patient-home/sections/complete-profile";
import { ContinueWhereLeft } from "@/features/patient-home/sections/continue-where-left";
import {
  AiCardSection,
  EmergencyLineSection,
  ExploreSection,
  GreetingSection,
  HelpSupportSection,
  NearYouSection,
  NeedsAttentionSection,
  PromoBannerSection,
  ShopsNearYouSection,
  UpNextSection,
  YourDoctorsSection,
} from "@/features/patient-home/sections/home-sections";
import { SectionBoundary } from "@/features/patient-home/sections/section-boundary";
import { getHomeSource } from "@/features/patient-home/sources/get-source";
import { DISMISS_PROFILE_CARD_COOKIE } from "@/features/profiles/server/profile-cookie";
import { ProfileSwitcher } from "@/features/profiles/components/profile-switcher";
import { loadProfileContext } from "@/features/profiles/server/selected-profile";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/home">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "metadata" });
  return { title: { absolute: t("title") }, robots: { index: false, follow: false } };
}

/** Same minimum heights for skeleton, content and error fallback, so nothing jumps. */
const HEIGHT = {
  up_next: "min-h-44 md:min-h-28",
  needs_attention: "min-h-28",
  your_doctors: "min-h-32",
  near_you: "min-h-96",
} as const;

/**
 * The signed-in home at "/" (docs/specs/signed-in-home.md Part D). The proxy rewrites "/" here only
 * when the session cookie verified; this page still checks the user with getUser() (authState):
 *   signed_in              -> the home sections, in a fixed order, each in its own boundary
 *   needs_finish / step_up -> the sign-in gate
 *   signed_out / unavailable -> the public home (no user data), until the token expires
 */
async function HomeContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/home">["searchParams"];
}) {
  if (!hasSupabaseEnv()) return <PublicHome />;
  const supabase = await createClient();
  const auth = await authState(supabase);
  if (auth.state === "needs_finish" || auth.state === "step_up") {
    const locale = await getLocale();
    redirect({
      href: loginHref(
        locale === "hi" ? "/hi" : "/",
        auth.state === "needs_finish" ? "finish" : "step_up",
      ),
      locale,
    });
  }
  if (auth.state !== "signed_in" || !auth.user) return <PublicHome />;

  const flags = getFlags();
  const source = await getHomeSource();
  const { selected, active } = await loadProfileContext(supabase, auth.user.id);
  const { data: defaultAddress } = selected
    ? await supabase
        .from("patient_addresses")
        .select("label, pincode")
        .eq("patient_profile_id", selected.profile.id)
        .eq("is_default", true)
        .maybeSingle()
    : { data: null };

  const switcherProfiles = active.map((profile) => ({
    id: profile.id,
    firstName: firstName(profile.fullName) ?? profile.fullName,
    relationship: profile.relationship,
  }));

  const ctx: HomeContext = {
    firstName: firstName(selected?.profile.isSelf ? selected.profile.fullName : auth.fullName),
    hasPhone: Boolean(auth.user.phone && auth.user.phone_confirmed_at),
    hasAddress: Boolean(defaultAddress),
    place: defaultAddress ? `${defaultAddress.label} ${defaultAddress.pincode}` : null,
    searchParams: await searchParams,
  };
  const completeProfile = { needsPhone: !ctx.hasPhone, needsAddress: !ctx.hasAddress };
  const outline = sectionsToRender(
    {
      presence: await source.presence(ctx),
      completeProfile,
      dismissed: (await cookies()).get(DISMISS_PROFILE_CARD_COOKIE)?.value === "1",
    },
    flags,
  );

  const render = (id: HomeSectionId) => {
    switch (id) {
      case "greeting":
        return (
          <GreetingSection
            key={id}
            firstName={ctx.firstName}
            aside={
              <ProfileSwitcher
                mode="card"
                profiles={switcherProfiles}
                selectedId={selected?.profile.id ?? null}
              />
            }
          />
        );
      case "complete_profile":
        return <CompleteProfileCard key={id} {...completeProfile} />;
      case "up_next":
        return (
          <SectionBoundary key={id} section={id} minHeight={HEIGHT.up_next}>
            <UpNextSection source={source} ctx={ctx} />
          </SectionBoundary>
        );
      case "needs_attention":
        return (
          <SectionBoundary key={id} section={id} minHeight={HEIGHT.needs_attention}>
            <NeedsAttentionSection source={source} ctx={ctx} />
          </SectionBoundary>
        );
      case "promo_banner":
        return <PromoBannerSection key={id} flags={flags} />;
      case "continue_where_left":
        return (
          <SectionBoundary key={id} section={id} minHeight="">
            <ContinueSlot source={source} ctx={ctx} />
          </SectionBoundary>
        );
      case "your_doctors":
        return (
          <SectionBoundary key={id} section={id} minHeight={HEIGHT.your_doctors}>
            <YourDoctorsSection source={source} ctx={ctx} />
          </SectionBoundary>
        );
      case "explore":
        return <ExploreSection key={id} flags={flags} />;
      case "near_you":
        return (
          <SectionBoundary key={id} section={id} minHeight={HEIGHT.near_you}>
            <NearYouSection source={source} ctx={ctx} />
          </SectionBoundary>
        );
      case "shops_near_you":
        return <ShopsNearYouSection key={id} />;
      case "ai_card":
        return <AiCardSection key={id} />;
      case "help_support":
        return <HelpSupportSection key={id} />;
      case "emergency_line":
        return <EmergencyLineSection key={id} />;
    }
  };

  /*
   * Up next is a compact, expandable row. When something needs attention, it sits beside Up next
   * on a wide screen (two thirds / one third); otherwise Up next takes the full width.
   */
  const withAttention = outline.includes("needs_attention");
  const sections = outline.flatMap((id) => {
    if (id === "needs_attention") return [];
    if (id === "up_next" && withAttention) {
      return [
        <div key="dashboard-row" className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{render("up_next")}</div>
          <div>{render("needs_attention")}</div>
        </div>,
      ];
    }
    return [render(id)];
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:py-8">
      {sections}
    </div>
  );
}

async function ContinueSlot({
  source,
  ctx,
}: {
  source: Awaited<ReturnType<typeof getHomeSource>>;
  ctx: HomeContext;
}) {
  return <ContinueWhereLeft unfinished={await source.unfinishedBooking(ctx)} />;
}

/**
 * No page-level Suspense: the (patient) segment blocks (instant = false), so the greeting, Up next
 * outline and Quick actions arrive in the first HTML, and only the data sections stream inside
 * their own fixed-height boundaries. A page-level skeleton would be replaced by a much taller
 * page and shift everything below it.
 */
export default async function SignedInHomePage({
  params,
  searchParams,
}: PageProps<"/[locale]/home">) {
  // Per request (greeting time, fixtures' relative times, the nonce): never prerendered.
  await connection();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <HomeContent searchParams={searchParams} />;
}
