"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { idleWarningLeadMs } from "@acurexpress/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@acurexpress/ui";
import { AUTH_CHANNEL } from "./clear-client-state";
import { createIdleTimer, type IdleTimer } from "./idle-timer";
import { useSignOut } from "./use-sign-out";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Idle sign-out (docs/specs/signed-in-home.md item 30). After `timeoutMinutes` without activity
 * (default 30, TODO_HCQ) it signs out and clears device state; a warning comes first. Activity in
 * any tab resets every tab. This is a client convenience, not the security boundary: server
 * session time-boxes are a Supabase Pro setting (docs/AUTH.md).
 */
export function IdleGuard({
  timeoutMinutes,
  paused = false,
}: {
  timeoutMinutes: number;
  paused?: boolean;
}) {
  const t = useTranslations("idle");
  const { signOut } = useSignOut();
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<IdleTimer | null>(null);
  const timeoutMs = timeoutMinutes * 60_000;
  const warnMs = idleWarningLeadMs(timeoutMs);

  useEffect(() => {
    if (paused) return;
    let lastActivity = Date.now();
    let channel: BroadcastChannel | null = null;
    const idle = createIdleTimer({
      timeoutMs,
      warnMs,
      now: () => Date.now(),
      onWarn: () => setWarning(true),
      onExpire: () => {
        setWarning(false);
        void signOut();
      },
    });
    timer.current = idle;

    const onActivity = () => {
      if (idle.phase() === "warning") return; // the dialog asks; only its buttons answer
      idle.activity();
      lastActivity = Date.now();
      try {
        channel?.postMessage("activity");
      } catch {
        // ignore
      }
    };
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (event.data === "activity") {
          idle.activity();
          lastActivity = Date.now();
          setWarning(false);
        }
      };
    } catch {
      channel = null;
    }
    for (const name of ACTIVITY_EVENTS)
      window.addEventListener(name, onActivity, { passive: true });
    const interval = window.setInterval(() => {
      idle.tick();
      setSecondsLeft(Math.max(0, Math.ceil((timeoutMs - (Date.now() - lastActivity)) / 1000)));
    }, 1000);

    return () => {
      idle.stop();
      window.clearInterval(interval);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      channel?.close();
    };
  }, [paused, signOut, timeoutMs, warnMs]);

  function stay() {
    timer.current?.activity();
    setWarning(false);
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage("activity");
      channel.close();
    } catch {
      // ignore
    }
  }

  return (
    <AlertDialog open={warning} onOpenChange={(open) => (open ? null : stay())}>
      <AlertDialogContent>
        <AlertDialogTitle>{t("title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("body", { seconds: secondsLeft })}</AlertDialogDescription>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <AlertDialogCancel
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-blue px-4 font-semibold text-white"
            onClick={stay}
          >
            {t("stay")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold text-ink"
            onClick={() => void signOut()}
          >
            {t("signOut")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
