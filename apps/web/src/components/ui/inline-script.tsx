"use client";

/**
 * Inline script that runs while the server HTML is parsed (before first paint) and is inert when
 * React renders it in the browser (soft navigations, e.g. switching language), so React never
 * warns about executing <script> tags. Pattern from Next.js "Preventing flash before hydration"
 * (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
