import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Locale negotiation and prefix handling.
// TODO(auth): chain Supabase session refresh (src/lib/supabase/middleware.ts) here.
export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes and files with an extension (images, icons, etc.).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
