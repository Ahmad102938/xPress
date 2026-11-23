import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getFlags } from "@acurexpress/core";
import { hasSupabaseEnv } from "@acurexpress/db";
import { SiteFooter } from "@/components/footer/site-footer";
import { EmergencyBar } from "@/components/layout/emergency-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { InlineScript } from "@/components/ui/inline-script";
import { EMERGENCY_DISMISSED_KEY } from "@/config/emergency";
import { getAuthMethods } from "@/config/auth-methods";
import { AuthLinkInterceptor } from "@/features/auth/components/auth-link-interceptor";
import { AuthProvider } from "@/features/auth/components/auth-provider";
import { LoginDrawerLazy } from "@/features/auth/components/login-drawer-lazy";
import { LocationProvider } from "@/features/location/location-provider";
import { LocationSheetLazy } from "@/features/location/location-sheet-lazy";

/**
 * Shared page shell for the (public) and (patient) groups (docs/specs/auth.md R2-M12): skip link,
 * emergency bar, sticky header, footer, mobile bottom nav, plus the auth context, the lazily
 * loaded sign-in drawer and the link interceptor. Methods are read on the server and passed down.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  const tEmergency = await getTranslations("emergency");
  const flags = getFlags();

  return (
    <AuthProvider methods={getAuthMethods()}>
      <LocationProvider>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-panel px-4 py-3 font-semibold text-brand-blue focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("skipToContent")}
        </a>
        {/* Before the bar is painted: hide it if it was dismissed earlier in this session. */}
        <InlineScript
          html={`try{if(sessionStorage.getItem("${EMERGENCY_DISMISSED_KEY}"))document.documentElement.dataset.emergencyDismissed="1"}catch(e){}`}
        />
        <EmergencyBar message={tEmergency("message")} dismissLabel={tEmergency("dismiss")} />
        <SiteHeader flags={flags} />
        <main id="main" className="pb-20 md:pb-0">
          {children}
        </main>
        <SiteFooter />
        {/* Spacer so the fixed bottom nav never covers the footer on small screens. */}
        <div aria-hidden="true" className="h-16 md:hidden" />
        <MobileBottomNav showShops={flags.shopNetwork} />
        <LoginDrawerLazy unavailable={!hasSupabaseEnv()} />
        <AuthLinkInterceptor />
        <LocationSheetLazy />
      </LocationProvider>
    </AuthProvider>
  );
}
