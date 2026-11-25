import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CircleAlert,
  CreditCard,
  FileUp,
  LifeBuoy,
  MapPin,
  MessageSquareWarning,
  Phone,
  Pill,
  Stethoscope,
  Store,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { greetingFor, type Flags } from "@acurexpress/core";
import { Button, cn } from "@acurexpress/ui";
import { ClinicCard } from "@/components/brand/clinic-card";
import { DoctorCard } from "@/components/brand/doctor-card";
import { ModeChip } from "@/components/brand/mode-chip";
import { AiPromo } from "@/components/home/promo-bands";
import { SampleDataNote } from "@/components/home/sample-data-note";
import { ShopMapTeaser } from "@/components/home/shop-map-teaser";
import { SectionHeader } from "@/components/ui/section-header";
import { company, isPlaceholder } from "@/config/company";
import { Link } from "@/i18n/navigation";
import type { HomeContext, HomeSource } from "../contract";
import { CollapsibleCard } from "./collapsible-card";
import { SlotHoldTimer } from "./slot-hold-timer";

/**
 * Server-rendered home sections (docs/specs/signed-in-home.md item 52), styled after the Stitch
 * signed-in reference: white 12px panels with a hairline border and soft shadow, tinted icon tiles,
 * one gradient banner. Each data section loads its own data from the source, inside its own
 * SectionBoundary. Cards show the doctor's speciality only. No numbers that are not real data.
 */

type Href = ComponentProps<typeof Link>["href"];

/** The panel every home card uses. */
export const homeCard = "panel border border-line p-4 sm:p-5";

/** Section title inside a panel: 18-20px, ink, never colour alone. */
const panelTitle = "text-lg leading-tight font-bold text-ink md:text-xl";

function IconTile({
  icon: Icon,
  tone = "blue",
  className,
}: {
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber";
  className?: string;
}) {
  const tones = {
    blue: "bg-tint-blue text-brand-blue",
    green: "bg-tint-green text-green-ink",
    amber: "bg-tint-cream text-warning",
  } as const;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-6" strokeWidth={1.9} />
    </span>
  );
}

/** First letters of the first and last word, for a photo-less doctor avatar. */
function initials(name: string): string {
  const words = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export async function GreetingSection({
  firstName,
  aside,
  now = new Date(),
}: {
  firstName: string | null;
  /** Right-hand slot on wide screens (the "Booking for" card). */
  aside?: ReactNode;
  now?: Date;
}) {
  const t = await getTranslations("patientHome");
  return (
    <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-extrabold text-balance text-ink md:text-3xl">
          {firstName
            ? t(`greeting.${greetingFor(now)}`, { name: firstName })
            : t("greeting.noName")}
        </h1>
        <p className="mt-1 text-body">{t("subtitle")}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/** The heading of the Up next card links to My appointments (the whole list). */
function UpNextHeadingLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/appointments" className="rounded-sm underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/**
 * Up next: a compact card that can be expanded (CollapsibleCard). The summary row keeps the one
 * fitting action visible; the details hold the secondary actions and the link to all appointments.
 */
export async function UpNextSection({ source, ctx }: { source: HomeSource; ctx: HomeContext }) {
  const t = await getTranslations("patientHome.upNext");
  const tSpeciality = await getTranslations("specialities.names");
  const format = await getFormatter();
  const next = await source.upNext(ctx);
  const allAppointments = (
    <Link
      href="/appointments"
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-brand-blue hover:underline"
    >
      {t("allAppointments")}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );

  if (!next) {
    return (
      <CollapsibleCard
        labelledBy="home-up-next"
        expandLabel={t("expand")}
        collapseLabel={t("collapse")}
        className={cn(homeCard, "h-full")}
        summary={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <IconTile icon={CalendarPlus} />
              <div className="min-w-0">
                <h2 id="home-up-next" className={panelTitle}>
                  <UpNextHeadingLink>{t("bookTitle")}</UpNextHeadingLink>
                </h2>
                <p className="mt-1 text-sm text-body">{t("bookBody")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 md:shrink-0">
              <Button asChild variant="book">
                <Link href="/doctors">
                  <CalendarPlus aria-hidden="true" />
                  {t("bookCta")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/consult">
                  <Video aria-hidden="true" />
                  {t("consultCta")}
                </Link>
              </Button>
            </div>
          </div>
        }
        details={
          <div className="flex flex-col gap-3">
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="flex items-center gap-3 rounded-xl bg-tint-green p-3">
                <Building2 aria-hidden="true" className="size-5 shrink-0 text-green-ink" />
                <span className="text-sm text-ink">{t("clinicHint")}</span>
              </li>
              <li className="flex items-center gap-3 rounded-xl bg-tint-blue p-3">
                <Video aria-hidden="true" className="size-5 shrink-0 text-brand-blue" />
                <span className="text-sm text-ink">{t("onlineHint")}</span>
              </li>
            </ul>
            <div>{allAppointments}</div>
          </div>
        }
      />
    );
  }

  const action = { join_call: t("join"), get_directions: t("directions"), check_in: t("checkIn") }[
    next.action
  ];
  const ActionIcon =
    next.action === "join_call" ? Video : next.action === "get_directions" ? MapPin : CalendarCheck;
  return (
    <CollapsibleCard
      labelledBy="home-up-next"
      expandLabel={t("expand")}
      collapseLabel={t("collapse")}
      className={cn(homeCard, "h-full")}
      summary={
        <div className="flex flex-col gap-3">
          <h2
            id="home-up-next"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-tint-green px-3 py-1 text-[13px] font-bold tracking-wide text-green-ink uppercase"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-brand-green" />
            <UpNextHeadingLink>{t("title")}</UpNextHeadingLink>
          </h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <IconTile icon={Stethoscope} />
              <div className="min-w-0">
                <p className="leading-snug font-bold text-ink md:text-lg">
                  {t("withDoctor", {
                    doctor: next.doctor.name,
                    speciality: tSpeciality(next.doctor.speciality),
                  })}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-deep-blue">
                  <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                  <time dateTime={next.startsAt}>
                    {format.dateTime(new Date(next.startsAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </time>
                </p>
              </div>
            </div>
            <Button
              asChild
              variant={next.action === "join_call" ? "book" : "amber"}
              className="w-fit md:shrink-0"
            >
              <Link href={`/appointments/${next.bookingId}`}>
                <ActionIcon aria-hidden="true" />
                {action}
              </Link>
            </Button>
          </div>
        </div>
      }
      details={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModeChip mode={next.mode} />
            {next.clinicName ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Building2 aria-hidden="true" className="size-4 shrink-0 text-green-ink" />
                {next.clinicName}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href={`/appointments/${next.bookingId}`}>{t("reschedule")}</Link>
            </Button>
            <Link
              href={`/appointments/${next.bookingId}`}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-brand-blue hover:underline"
            >
              {t("details")}
            </Link>
            {allAppointments}
          </div>
        </div>
      }
    />
  );
}

export async function NeedsAttentionSection({
  source,
  ctx,
}: {
  source: HomeSource;
  ctx: HomeContext;
}) {
  const items = await source.attention(ctx);
  if (items.length === 0) return null;
  const t = await getTranslations("patientHome.attention");
  return (
    <section
      aria-labelledby="home-attention"
      className={cn(homeCard, "flex h-full flex-col gap-3")}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-attention" className={cn(panelTitle, "flex items-center gap-2")}>
          <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-warning" />
          {t("title")}
        </h2>
        <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-[13px] font-bold text-warning">
          {t("count", { count: items.length })}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.bookingId}
            className="flex flex-col gap-3 rounded-xl border border-amber/40 bg-tint-cream p-3"
          >
            <div className="flex items-start gap-3">
              <CreditCard aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {t("paymentPending", { doctor: item.doctor.name })}
                </p>
                <SlotHoldTimer expiresAt={item.holdExpiresAt} />
              </div>
            </div>
            <Button asChild variant="amber" className="w-full sm:w-fit">
              <Link href={`/appointments/${item.bookingId}`}>{t("pay")}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One static gradient banner (not a carousel: no rotating claims on a private page). The message
 * follows the flags: prescription upload when medicine sales are on, else online consultation.
 */
export async function PromoBannerSection({ flags }: { flags: Flags }) {
  const variant = flags.medicineSales ? "prescription" : "consult";
  const t = await getTranslations(`patientHome.banner.${variant}`);
  const Icon = variant === "prescription" ? FileUp : Video;
  const href = variant === "prescription" ? "/prescriptions/upload" : "/consult";
  return (
    <section
      aria-labelledby="home-banner"
      className="focus-light relative isolate overflow-hidden rounded-2xl bg-hero p-6 text-white sm:p-8 md:bg-hero-wide md:p-10"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-40 -bottom-24 -z-10 size-56 rounded-full bg-white/5"
      />
      <div className="flex items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white">
            <Icon aria-hidden="true" className="size-4" />
            {t("badge")}
          </p>
          <h2
            id="home-banner"
            className="mt-3 text-2xl leading-tight font-extrabold text-balance text-white md:text-4xl"
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-white md:text-lg">{t("body")}</p>
          <Button asChild variant="onDark" size="lg" className="mt-5">
            <Link href={href}>
              {t("cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <span
          aria-hidden="true"
          className="hidden size-36 shrink-0 items-center justify-center rounded-3xl border border-white/25 bg-white/10 sm:flex lg:size-44"
        >
          <Icon className="size-16 text-white lg:size-20" strokeWidth={1.5} />
        </span>
      </div>
    </section>
  );
}

export async function YourDoctorsSection({
  source,
  ctx,
}: {
  source: HomeSource;
  ctx: HomeContext;
}) {
  const doctors = await source.yourDoctors(ctx);
  if (doctors.length === 0) return null;
  const t = await getTranslations("patientHome.yourDoctors");
  const tSpeciality = await getTranslations("specialities.names");
  return (
    <section aria-labelledby="home-your-doctors">
      <SectionHeader
        id="home-your-doctors"
        title={t("title")}
        viewAllHref="/appointments?tab=past"
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <li key={doctor.id} className={cn(homeCard, "flex flex-col gap-4")}>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-tint-blue text-lg font-bold text-deep-blue ring-2 ring-tint-green ring-offset-2"
              >
                {initials(doctor.name) || <UserRound className="size-6" />}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{doctor.name}</p>
                <p className="text-sm text-body">{tSpeciality(doctor.speciality)}</p>
              </div>
            </div>
            <Button asChild variant="book" className="mt-auto w-full">
              <Link
                href={`/doctors/${doctor.id}`}
                aria-label={t("followUpLabel", { doctor: doctor.name })}
              >
                {t("followUp")}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Three gradient tiles that lead to discovery pages. Flag-off services are hidden, not greyed. */
export async function ExploreSection({ flags }: { flags: Flags }) {
  const t = await getTranslations("patientHome.explore");
  type TileKey = "clinics" | "specialities" | "shops" | "medicines";
  const tiles: Array<{ key: TileKey; href: Href; icon: LucideIcon; bg: string; show: boolean }> = [
    { key: "clinics", href: "/clinics", icon: Building2, bg: "bg-banner-blue", show: true },
    {
      key: "specialities",
      href: "/specialities",
      icon: Stethoscope,
      bg: "bg-brand-green",
      show: true,
    },
    { key: "shops", href: "/shops", icon: Store, bg: "bg-banner-navy", show: flags.shopNetwork },
    {
      key: "medicines",
      href: "/medicines",
      icon: Pill,
      bg: "bg-banner-navy",
      show: flags.medicineSales,
    },
  ];
  const visible = tiles.filter((tile) => tile.show).slice(0, 3);
  return (
    <section aria-labelledby="home-explore">
      <h2 id="home-explore" className="sr-only">
        {t("title")}
      </h2>
      <ul className={cn("grid gap-4", visible.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {visible.map(({ key, href, icon: Icon, bg }) => (
          <li key={key}>
            <Link
              href={href}
              className={cn(
                "focus-light group relative flex h-full min-h-36 flex-col justify-between gap-4 overflow-hidden rounded-2xl p-5 text-white shadow-sm transition hover:shadow-md",
                bg,
              )}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -bottom-10 size-32 rounded-full bg-white/10"
              />
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-lg font-bold text-white">{t(`${key}.title`)}</span>
                  <span className="mt-1 block text-sm text-white">{t(`${key}.body`)}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15"
                >
                  <Icon className="size-6" />
                </span>
              </span>
              <span className="relative inline-flex min-h-9 w-fit items-center gap-1 rounded-full bg-white px-3.5 text-sm font-semibold text-deep-blue">
                {t(`${key}.cta`)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition motion-safe:group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function NearYouSection({ source, ctx }: { source: HomeSource; ctx: HomeContext }) {
  const near = await source.nearYou(ctx);
  const t = await getTranslations("patientHome.nearYou");
  return (
    <section aria-labelledby="home-near-you" className={homeCard}>
      <SectionHeader
        id="home-near-you"
        title={t("title")}
        subtitle={near.place ? t("subtitle", { place: near.place }) : t("subtitleDefault")}
        viewAllHref="/doctors"
      />
      <ul
        tabIndex={0}
        aria-labelledby="home-near-you"
        className="scroller -mx-4 gap-4 px-4 pb-1 sm:-mx-5 sm:px-5"
      >
        {near.doctors.slice(0, 4).map((doctor) => (
          <li key={doctor.id} className="w-[17.5rem] shrink-0">
            <DoctorCard doctor={doctor} />
          </li>
        ))}
        {near.clinics.slice(0, 2).map((clinic) => (
          <li key={clinic.id} className="w-[17.5rem] shrink-0">
            <ClinicCard clinic={clinic} />
          </li>
        ))}
      </ul>
      {near.sample ? <SampleDataNote /> : null}
    </section>
  );
}

/** Static map teaser (no pins until shops with verified coordinates exist, hard rule 7). */
export function ShopsNearYouSection() {
  return <ShopMapTeaser />;
}

/** AI Health Consultant band with its persistent disclaimer (Addendum A). Flag-gated by the outline. */
export function AiCardSection() {
  return <AiPromo />;
}

export async function HelpSupportSection() {
  const t = await getTranslations("patientHome.help");
  // Only a confirmed number becomes a tel: link; until then the line points to the Support page.
  const phone = isPlaceholder(company.support.phone) ? null : company.support.phone;
  const links: Array<{ key: "bookings" | "account" | "problem"; href: Href; icon: LucideIcon }> = [
    { key: "bookings", href: "/appointments", icon: CalendarCheck },
    { key: "account", href: "/account", icon: UserRound },
    { key: "problem", href: "/grievance", icon: MessageSquareWarning },
  ];
  return (
    <section aria-labelledby="home-help" className="flex flex-col gap-3">
      <h2 id="home-help" className={panelTitle}>
        {t("title")}
      </h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {links.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href}
              className={cn(
                homeCard,
                "group flex h-full items-center gap-3 transition hover:border-brand-blue/50",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tint-blue text-brand-blue"
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{t(`${key}.title`)}</span>
                <span className="block text-sm text-body">{t(`${key}.body`)}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted transition motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-line bg-panel px-4 py-3 text-center text-sm text-ink">
        <LifeBuoy aria-hidden="true" className="size-4 shrink-0 text-brand-blue" />
        {phone ? (
          <>
            <span>{t("phoneLead")}</span>
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="font-semibold text-brand-blue underline-offset-2 hover:underline"
            >
              {phone}
            </a>
          </>
        ) : (
          <>
            <span>{t("supportLead")}</span>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center font-semibold text-brand-blue underline-offset-2 hover:underline"
            >
              {t("supportLink")}
            </Link>
          </>
        )}
      </p>
    </section>
  );
}

export async function EmergencyLineSection() {
  const t = await getTranslations("emergency");
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber/50 bg-tint-cream px-4 py-3 text-sm text-ink">
      <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>{t("message")}</span>
    </p>
  );
}
