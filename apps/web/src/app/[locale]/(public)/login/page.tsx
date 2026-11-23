import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AUTH_ERROR, sanitizeNextPath, type AuthErrorKey } from "@acurexpress/core";
import { hasSupabaseEnv } from "@acurexpress/db";
import { getAuthMethods } from "@/config/auth-methods";
import { LoginPagePanel } from "@/features/auth/components/login-page-panel";
import { authState } from "@/features/auth/server/auth-state";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "auth" });
  return { title: t("panelTitle"), robots: { index: false, follow: false } };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /login (docs/specs/auth.md items 44, R1-M12, R2-M3): the page variant of the sign-in panel.
 * Signed in: go to `next`. Gate needed: open at that step. Signed out: first step.
 */
async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/login">["searchParams"];
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(first(params.next), routing.locales);
  const auth = await authState();
  if (auth.state === "signed_in") redirect(next);

  const error = first(params.error);
  const initialError =
    error && (AUTH_ERROR as readonly string[]).includes(error) ? (error as AuthErrorKey) : null;
  const start =
    auth.state === "needs_finish" ? "finish" : auth.state === "step_up" ? "step_up" : "start";

  return (
    <LoginPagePanel
      methods={getAuthMethods()}
      start={start}
      next={next}
      initialError={initialError}
      unavailable={!hasSupabaseEnv()}
    />
  );
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="panel overflow-hidden pt-2">
        <noscript>
          <p className="m-5 rounded-md border border-line bg-page p-4 text-center text-body">
            {t("noscript")}
          </p>
        </noscript>
        <Suspense fallback={<div className="min-h-96" aria-busy="true" />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
