"use client";

import { useTransition } from "react";
import { ChevronDown, UserRound, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import { selectProfile } from "../actions";

export interface SwitcherProfile {
  id: string;
  firstName: string;
  relationship: string;
}

/**
 * Profile switcher (docs/specs/signed-in-home.md item 40), like switching workspaces. Renders
 * nothing unless the account has two or more non-archived profiles (G8). Choosing a profile only
 * changes what the screens show; every action still names its profile explicitly.
 * `mode="booking"` is the "Booking for" control used on booking surfaces. `mode="card"` is the
 * larger "Booking for" card on the signed-in home: it also shows with a single profile, so the
 * patient always sees who they are booking for and can reach "Manage family profiles".
 */
export function ProfileSwitcher({
  profiles,
  selectedId,
  mode = "header",
  onChanged,
  className,
}: {
  profiles: SwitcherProfile[];
  selectedId: string | null;
  mode?: "header" | "booking" | "card";
  onChanged?: () => void | Promise<unknown>;
  className?: string;
}) {
  const t = useTranslations("family");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (profiles.length < (mode === "card" ? 1 : 2)) return null;
  const selected = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
  const relationship = (value: string) => t(`relationships.${value}` as "relationships.self");

  function choose(id: string) {
    if (id === selected?.id) return;
    startTransition(async () => {
      const result = await selectProfile(id);
      if (result.ok) {
        await onChanged?.();
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      {mode === "card" ? (
        <DropdownMenuTrigger
          disabled={pending}
          className={cn(
            "inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel py-2 pr-3 pl-2 text-left shadow-sm hover:border-brand-blue/50 hover:bg-tint-blue-soft focus-visible:outline-2 focus-visible:outline-brand-blue",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-blue text-brand-blue"
          >
            <UserRound className="size-5" />
          </span>
          {/* Visible text is the accessible name (WCAG 2.5.3); the hint is added for screen readers. */}
          <span className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold tracking-wide text-body uppercase">
              {t("bookingForCaption")}
            </span>{" "}
            <span className="truncate font-semibold text-ink">
              {t("bookingForValue", {
                relationship: relationship(selected?.relationship ?? "self"),
                name: selected?.firstName ?? "",
              })}
            </span>
          </span>
          <span className="sr-only">{t("changeWho")}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-body" />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          disabled={pending}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-panel px-3 text-sm font-medium text-ink hover:bg-tint-blue focus-visible:outline-2 focus-visible:outline-brand-blue",
            className,
          )}
        >
          <UsersRound aria-hidden="true" className="size-4 text-brand-blue" />
          {/* The accessible name contains the visible text (WCAG 2.5.3). */}
          <span aria-hidden="true">
            {mode === "booking"
              ? t("bookingFor", { name: selected?.firstName ?? "" })
              : selected?.firstName}
          </span>
          <span className="sr-only">
            {mode === "booking"
              ? t("bookingForLabel", { name: selected?.firstName ?? "" })
              : t("switcherLabel", { name: selected?.firstName ?? "" })}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 text-body" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>{t("switchTo")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selected?.id ?? ""} onValueChange={choose}>
          {profiles.map((profile) => (
            <DropdownMenuRadioItem key={profile.id} value={profile.id}>
              <span
                aria-hidden="true"
                className="inline-flex size-7 items-center justify-center rounded-full bg-tint-blue text-xs font-bold text-brand-blue"
              >
                {Array.from(profile.firstName)[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="flex flex-col">
                <span>{profile.firstName}</span>
                <span className="text-xs text-muted">{relationship(profile.relationship)}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account#family">{t("manage")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
