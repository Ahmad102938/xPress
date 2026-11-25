"use client";

import { useCallback, useState } from "react";
import { signOutAction } from "@/features/auth/actions";
import { clearClientState } from "./clear-client-state";

/**
 * Client sign-out (docs/specs/signed-in-home.md item 31): end the session on the server, clear
 * device state, then load a fresh document with location.replace, so no private page stays in
 * React's router cache or the back-forward cache. Clears and navigates even if the action fails.
 */
export function useSignOut(destination: "/" | "/contact" = "/") {
  const [pending, setPending] = useState(false);
  const signOut = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      await signOutAction();
    } catch {
      // Still clear and leave: the server session expires on its own.
    }
    clearClientState();
    window.location.replace(destination);
  }, [destination, pending]);
  return { signOut, pending };
}
