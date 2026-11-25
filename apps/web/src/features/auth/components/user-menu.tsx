"use client";

import { CalendarCheck, ChevronDown, CircleHelp, LogOut, Settings, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import { useSignOut } from "@/features/session/use-sign-out";
import type { SessionView } from "./auth-provider";

/**
 * Signed-in header menu (docs/specs/signed-in-home.md item 56): initials only (no photo), the first
 * name and the MASKED contact, then My appointments, Profile, Account, Support and Sign out.
 * Radix menu: Enter or arrows open it, arrows move, Escape closes and returns focus.
 * Sign out ends the session, clears device state and loads a fresh document (useSignOut).
 */
export function UserMenu({ session }: { session: SessionView }) {
  const t = useTranslations("auth.userMenu");
  const { signOut, pending } = useSignOut();
  const name = session.name ?? "";

  return (
    <DropdownMenu>
      {/* Named by its text (WCAG 2.5.3): the initials are decorative, the label is visually hidden. */}
      <DropdownMenuTrigger className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full pr-1 hover:bg-tint-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white"
        >
          {session.initials || <UserRound className="size-5" />}
        </span>
        <span className="sr-only">{t("label", { name })}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-body" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-ink">{name}</span>
          {session.maskedContact ? (
            <span className="truncate text-xs font-normal text-muted" data-testid="masked-contact">
              {session.maskedContact}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/appointments">
            <CalendarCheck aria-hidden="true" className="size-4 text-brand-blue" />
            {t("appointments")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden="true" className="size-4 text-brand-blue" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings aria-hidden="true" className="size-4 text-brand-blue" />
            {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/support">
            <CircleHelp aria-hidden="true" className="size-4 text-brand-blue" />
            {t("support")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" className="size-4 text-brand-blue" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
