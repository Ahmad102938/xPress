import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES } from "@/security/route-class";

/** Private pages are never indexed (docs/specs/signed-in-home.md item 25), in English and Hindi. */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = PRIVATE_PREFIXES.flatMap((prefix) => [prefix, `/hi${prefix}`]);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...privatePaths, "/auth/", "/api/"] }],
  };
}
