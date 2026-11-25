"use client";

import { useEffect } from "react";
import { routing } from "@/i18n/routing";
import { useAuth, type PanelStart } from "./auth-provider";

/**
 * With JavaScript, clicks on sign-in links open the panel instead of navigating (item 43, R2-M12):
 *  - `/login` links (with or without `?next=`), whatever the session state;
 *  - links to protected pages (`/account`, `/appointments`) while signed out or gated.
 * Signed-in users, unknown state (still loading) and modified clicks navigate normally.
 */
const PROTECTED = ["/account", "/appointments"];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export function AuthLinkInterceptor() {
  const { session, openPanel } = useAuth();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const path = stripLocale(url.pathname);
      const state = session?.state;
      // Sign-in cannot be checked right now: let the link load /login, which says so.
      if (state === "unavailable") return;
      const step: PanelStart =
        state === "needs_finish" ? "finish" : state === "step_up" ? "step_up" : "start";

      if (path === "/login") {
        if (state === "signed_in") return; // /login sends signed-in users on to `next`
        event.preventDefault();
        event.stopPropagation();
        openPanel({ next: url.searchParams.get("next") ?? undefined, step });
        return;
      }
      const isProtected = PROTECTED.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      if (isProtected && state && state !== "signed_in") {
        event.preventDefault();
        event.stopPropagation();
        openPanel({ next: `${url.pathname}${url.search}`, step });
      }
    }
    // Capture phase: runs before Next's <Link> handler, which would otherwise navigate client-side.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [session?.state, openPanel]);

  return null;
}
