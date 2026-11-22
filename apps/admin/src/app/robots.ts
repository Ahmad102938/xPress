import type { MetadataRoute } from "next";

/** admin.acurexpress.com is never crawled. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
