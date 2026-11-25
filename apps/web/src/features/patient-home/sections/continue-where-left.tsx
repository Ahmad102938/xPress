"use client";

import { useSyncExternalStore } from "react";
import { CalendarClock, History, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, cn } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import {
  RECENT_SEARCHES_KEY,
  readRecentSearches,
  subscribeRecentSearches,
  clearRecentSearches,
} from "@/features/session/recent-searches";
import type { DoctorRef } from "../contract";

const EMPTY: readonly string[] = [];

/**
 * "Continue where you left off" (docs/specs/signed-in-home.md item 52). Recent searches live on this
 * device only (cleared on sign-out) and are never sent to the server, so this section renders on
 * the client (server snapshot: hidden) and shows nothing when there is nothing to continue.
 * Wide screens show the unfinished booking and recent searches side by side.
 */
export function ContinueWhereLeft({
  unfinished,
}: {
  unfinished: { bookingId: string; doctor: DoctorRef } | null;
}) {
  const t = useTranslations("patientHome.continue");
  const searches = useSyncExternalStore(subscribeRecentSearches, readRecentSearches, () => EMPTY);
  if (!unfinished && searches.length === 0) return null;
  const both = Boolean(unfinished) && searches.length > 0;

  return (
    <section
      aria-labelledby="home-continue"
      data-storage-key={RECENT_SEARCHES_KEY}
      className="panel border border-line p-4 sm:p-5"
    >
      <h2
        id="home-continue"
        className="mb-4 flex items-center gap-2 text-lg font-bold text-ink md:text-xl"
      >
        <History aria-hidden="true" className="size-5 text-brand-blue" />
        {t("title")}
      </h2>
      <div
        className={cn("grid gap-4", both && "md:grid-cols-2 md:gap-0 md:divide-x md:divide-line")}
      >
        {unfinished ? (
          <div className={cn("flex flex-col gap-3", both && "md:pr-5")}>
            <h3 className="text-[13px] font-bold tracking-wide text-deep-blue uppercase">
              {t("unfinishedTitle")}
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tint-blue p-3">
              <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-brand-blue" />
                {t("unfinished", { doctor: unfinished.doctor.name })}
              </p>
              <Button asChild size="sm">
                <Link href={`/appointments/${unfinished.bookingId}`}>{t("resume")}</Link>
              </Button>
            </div>
          </div>
        ) : null}
        {searches.length ? (
          <div className={cn("flex flex-col gap-2", both && "md:pl-5")}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold tracking-wide text-deep-blue uppercase">
                {t("recentSearches")}
              </h3>
              <Button size="sm" variant="ghost" onClick={clearRecentSearches}>
                {t("clear")}
              </Button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {searches.map((query) => (
                <li key={query}>
                  <Link
                    href={{ pathname: "/doctors", query: { q: query } }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-tint-blue-soft px-4 text-sm text-ink hover:border-brand-blue/50 hover:bg-tint-blue"
                  >
                    <Search aria-hidden="true" className="size-3.5 text-muted" />
                    {query}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
