import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { assertProductionEnv } from "./src/config/env-check";
import { staticHeaders } from "./src/security/static-headers";

// Fails Vercel production builds that lack required env (docs/specs/auth.md R1-B1, R2-M5).
assertProductionEnv();

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The auth e2e build uses its own folder so it never overwrites the normal build (R2-B2).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Internal workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@acurexpress/core", "@acurexpress/db", "@acurexpress/ui"],
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Hardening headers on every response (docs/specs/signed-in-home.md item 24). No CSP here: the
  // proxy sets exactly one per page (public or private level, Step 0 result R2).
  async headers() {
    return [{ source: "/(.*)", headers: staticHeaders(process.env) }];
  },
};

export default withNextIntl(nextConfig);
