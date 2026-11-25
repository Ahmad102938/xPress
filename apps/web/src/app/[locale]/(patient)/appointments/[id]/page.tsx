import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { uuidSchema } from "@acurexpress/core";
import { requirePatient } from "@/features/auth/server/require-patient";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/appointments/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "appointments" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * One appointment (docs/specs/signed-in-home.md item 55). Sign-in is checked FIRST, so a signed-out
 * visitor goes to sign-in (with `next=/appointments`, never the id). Then the id must be a UUID,
 * and the booking is read through RLS once bookings exist. A missing booking and someone else's
 * booking give the same not-found page, never a 403. No booking table exists yet, so every id is
 * not found. Under cacheComponents the check runs after streaming starts, so the HTTP status is
 * 200 (known gap, docs/AUTH.md).
 */
async function AppointmentContent({
  params,
}: {
  params: PageProps<"/[locale]/appointments/[id]">["params"];
}): Promise<never> {
  const { id } = await params;
  await requirePatient(`/appointments/${id}`);
  if (!uuidSchema.safeParse(id).success) notFound();
  // TODO(booking module): select the booking by id with the user's session; null -> notFound().
  return notFound();
}

/** Fully per-request, like the rest of (patient), so the CSP nonce reaches every script (R2). */
export const instant = false;

export default async function AppointmentPage({
  params,
}: PageProps<"/[locale]/appointments/[id]">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <Suspense fallback={<div className="mx-auto min-h-48 max-w-7xl px-4 py-8" aria-busy="true" />}>
      <AppointmentContent params={params} />
    </Suspense>
  );
}
