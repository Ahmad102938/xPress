"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile (Supabase built-in captcha, Q4a). Renders nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. The script is loaded by hand, only when needed, and the
 * token goes to the send action, which passes it to Supabase.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function isCaptchaEnabled(): boolean {
  return Boolean(SITE_KEY);
}

export function TurnstileWidget({
  onToken,
  locale,
}: {
  onToken: (token: string | null) => void;
  locale: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !container.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          language: locale,
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [locale, onToken]);

  if (!SITE_KEY) return null;
  return <div ref={container} className="mt-3 min-h-16" />;
}
