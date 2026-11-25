"use client";

import { useEffect, useRef } from "react";
import { AUTH_CHANNEL } from "./clear-client-state";

interface SessionPeek {
  state?: string;
  userTag?: string | null;
}

async function peek(): Promise<SessionPeek | null> {
  try {
    const response = await fetch("/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return (await response.json()) as SessionPeek;
  } catch {
    return null;
  }
}

function leave() {
  window.location.replace("/");
}

/**
 * Back-after-sign-out protection (docs/specs/signed-in-home.md item 32). Private pages are sent
 * with no-store, which keeps most browsers from restoring them, but some may still use the
 * back-forward cache. When a page is restored from it, this hides the page at once, asks the
 * server who is signed in, and leaves for "/" if the answer is signed out or a different person.
 * A sign-out in another tab does the same through the broadcast channel.
 */
export function PrivatePageGuard() {
  const tag = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void peek().then((view) => {
      if (!cancelled && view?.state === "signed_in") tag.current = view.userTag ?? null;
    });

    function hide(hidden: boolean) {
      document.getElementById("main")?.toggleAttribute("hidden", hidden);
    }

    async function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      hide(true);
      const view = await peek();
      const sameUser =
        view?.state === "signed_in" && (tag.current === undefined || view.userTag === tag.current);
      if (sameUser) hide(false);
      else leave();
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (event.data === "signed_out") {
          hide(true);
          leave();
        }
      };
    } catch {
      channel = null;
    }

    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
      channel?.close();
    };
  }, []);

  return null;
}
