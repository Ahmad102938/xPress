"use client";

import { useRouter } from "next/navigation";
import type { AuthErrorKey, AuthMethodId } from "@acurexpress/core";
import type { PanelStart } from "./auth-provider";
import { LoginPanel } from "./login-panel";

/** The panel on the /login page (page variant). After sign-in it goes to the sanitised `next`. */
export function LoginPagePanel(props: {
  methods: AuthMethodId[];
  start: PanelStart;
  next: string;
  initialError: AuthErrorKey | null;
  unavailable: boolean;
}) {
  const router = useRouter();
  return (
    <LoginPanel
      variant="page"
      {...props}
      onSignedIn={() => {
        router.replace(props.next);
        router.refresh();
      }}
    />
  );
}
