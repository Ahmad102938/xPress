"use client";

import dynamic from "next/dynamic";
import { useAuth } from "./auth-provider";

/** Loads the drawer code only when the panel first opens (N6), so Home's JavaScript stays small. */
const LoginDrawer = dynamic(() => import("./login-drawer").then((module) => module.LoginDrawer), {
  ssr: false,
});

export function LoginDrawerLazy({ unavailable }: { unavailable: boolean }) {
  const { isOpen } = useAuth();
  return isOpen ? <LoginDrawer unavailable={unavailable} /> : null;
}
