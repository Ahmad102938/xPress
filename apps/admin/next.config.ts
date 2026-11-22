import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
  // The admin app has a single placeholder page for now. TODO(auth): MFA-gated admin routes.
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  // Belt and braces with the robots metadata and robots.txt: nothing on this host is indexed.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default withNextIntl(nextConfig);
