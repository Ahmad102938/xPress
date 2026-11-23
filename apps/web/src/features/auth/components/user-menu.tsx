"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarCheck, ChevronDown, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signOut } from "../actions";
import type { SessionView } from "./auth-provider";

/**
 * Signed-in header menu (G10): initials or the Google photo, My appointments, Profile, Logout.
 * A disclosure menu: Escape and outside clicks close it, focus returns to the button.
 * Logout is a form posting the server action (POST only).
 */
export function UserMenu({ session }: { session: SessionView }) {
  const t = useTranslations("auth.userMenu");
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const name = session.name ?? "";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const itemClass =
    "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-ink hover:bg-tint-blue";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={t("label", { name })}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full pr-1 hover:bg-tint-blue"
      >
        {session.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar, no optimisation needed
          <img
            src={session.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-9 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white"
          >
            {session.initials || <UserRound className="size-5" />}
          </span>
        )}
        <ChevronDown aria-hidden="true" className="size-4 text-body" />
      </button>
      {open ? (
        <div
          id={`${id}-menu`}
          className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-line bg-panel p-2 shadow-xl"
        >
          <p className="truncate px-3 py-2 text-sm font-semibold text-ink">{name}</p>
          <ul className="flex flex-col gap-1">
            <li>
              <Link href="/appointments" className={itemClass} onClick={() => setOpen(false)}>
                <CalendarCheck aria-hidden="true" className="size-4 text-brand-blue" />
                {t("appointments")}
              </Link>
            </li>
            <li>
              <Link href="/account" className={itemClass} onClick={() => setOpen(false)}>
                <UserRound aria-hidden="true" className="size-4 text-brand-blue" />
                {t("profile")}
              </Link>
            </li>
            <li>
              <form action={async () => signOut("/")}>
                <button type="submit" className={itemClass}>
                  <LogOut aria-hidden="true" className="size-4 text-brand-blue" />
                  {t("logout")}
                </button>
              </form>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
