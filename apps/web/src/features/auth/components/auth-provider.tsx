"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_ERROR,
  safeReturnPath,
  type AuthErrorKey,
  type AuthMethodId,
} from "@acurexpress/core";
import { routing } from "@/i18n/routing";

/**
 * Client auth context (docs/specs/auth.md item 37, R2-M12): the header session state from
 * /auth/session, the panel's open state, the return path and the starting step. It reads
 * `?login=1&next=&step=&error=` after mount (window.location, so public pages stay static) and
 * removes those parameters when the panel closes.
 */

export type GateState = "signed_out" | "needs_finish" | "step_up" | "signed_in" | "unavailable";
export type PanelStart = "start" | "finish" | "step_up";

/** Mirrors app/auth/session/route.ts. Masked contact only; initials, no photo URL. */
export interface SessionView {
  state: GateState;
  name: string | null;
  initials: string;
  maskedContact: string | null;
  userTag: string | null;
  profiles: Array<{ id: string; firstName: string; relationship: string }>;
  selectedProfileId: string | null;
  addressChip: { label: string; pin: string } | null;
}

export const SIGNED_OUT_VIEW: SessionView = {
  state: "signed_out",
  name: null,
  initials: "",
  maskedContact: null,
  userTag: null,
  profiles: [],
  selectedProfileId: null,
  addressChip: null,
};

export interface OpenOptions {
  next?: string;
  step?: PanelStart;
}

interface AuthContextValue {
  /** null while loading. */
  session: SessionView | null;
  refresh: () => Promise<SessionView | null>;
  methods: AuthMethodId[];
  isOpen: boolean;
  next: string;
  start: PanelStart;
  initialError: AuthErrorKey | null;
  openPanel: (options?: OpenOptions) => void;
  closePanel: () => void;
  /** Called by the panel after a completed sign-in: refresh, go to `next`, close. */
  completeSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGIN_PARAMS = ["login", "next", "step", "error"] as const;

async function fetchSession(): Promise<SessionView> {
  try {
    const response = await fetch("/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return (await response.json()) as SessionView;
  } catch {
    return SIGNED_OUT_VIEW;
  }
}

function currentPath(): string {
  const url = new URL(window.location.href);
  for (const param of LOGIN_PARAMS) url.searchParams.delete(param);
  return `${url.pathname}${url.search}`;
}

function stepFrom(value: string | null): PanelStart {
  return value === "finish" ? "finish" : value === "step_up" ? "step_up" : "start";
}

function startFor(state: GateState | undefined, requested: PanelStart): PanelStart {
  if (state === "needs_finish") return "finish";
  if (state === "step_up") return "step_up";
  return requested;
}

export function AuthProvider({
  methods,
  children,
}: {
  methods: AuthMethodId[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionView | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [next, setNext] = useState("/");
  const [start, setStart] = useState<PanelStart>("start");
  const [initialError, setInitialError] = useState<AuthErrorKey | null>(null);
  const pushedHistory = useRef(false);

  const refresh = useCallback(async () => {
    const view = await fetchSession();
    setSession(view);
    return view;
  }, []);

  const openPanel = useCallback(
    (options: OpenOptions = {}) => {
      setNext(safeReturnPath(options.next ?? currentPath(), routing.locales));
      setStart(startFor(session?.state, options.step ?? "start"));
      setIsOpen(true);
      // The mobile back button closes the panel instead of leaving the page.
      if (!pushedHistory.current) {
        window.history.pushState({ ...(window.history.state ?? {}), acxLogin: true }, "");
        pushedHistory.current = true;
      }
    },
    [session?.state],
  );

  const stripParams = useCallback(() => {
    const url = new URL(window.location.href);
    if (LOGIN_PARAMS.some((param) => url.searchParams.has(param))) {
      for (const param of LOGIN_PARAMS) url.searchParams.delete(param);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setInitialError(null);
    stripParams();
    if (pushedHistory.current) {
      pushedHistory.current = false;
      window.history.back();
    }
  }, [stripParams]);

  const completeSignIn = useCallback(async () => {
    await refresh();
    const target = next;
    setIsOpen(false);
    stripParams();
    pushedHistory.current = false;
    router.replace(target);
    router.refresh();
  }, [next, refresh, router, stripParams]);

  // Load the session, then honour ?login=1 links (protected-route redirects, callbacks, no-JS links).
  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((view) => {
      if (cancelled) return;
      setSession(view);
      const params = new URL(window.location.href).searchParams;
      if (params.get("login") !== "1") return;
      const error = params.get("error");
      setInitialError(
        error && (AUTH_ERROR as readonly string[]).includes(error) ? (error as AuthErrorKey) : null,
      );
      setNext(safeReturnPath(params.get("next") ?? "/", routing.locales));
      setStart(startFor(view?.state, stepFrom(params.get("step"))));
      setIsOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPopState() {
      if (pushedHistory.current) {
        pushedHistory.current = false;
        setIsOpen(false);
        setInitialError(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      refresh,
      methods,
      isOpen,
      next,
      start,
      initialError,
      openPanel,
      closePanel,
      completeSignIn,
    }),
    [
      session,
      refresh,
      methods,
      isOpen,
      next,
      start,
      initialError,
      openPanel,
      closePanel,
      completeSignIn,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** For components that may render outside the provider (for example in unit tests). */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
