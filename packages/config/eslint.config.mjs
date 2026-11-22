import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/** Rules every workspace shares on top of the Next.js presets. */
const shared = {
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};

const commonIgnores = [
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  "playwright-report/**",
  "test-results/**",
  "**/database.types.ts",
];

/**
 * Flat config for a Next.js app (apps/*).
 * @param {{ ignores?: string[] }} [options]
 */
export function nextAppConfig({ ignores = [] } = {}) {
  return [
    ...nextVitals,
    ...nextTs,
    prettier,
    shared,
    globalIgnores([...commonIgnores, ...ignores]),
  ];
}

/**
 * Flat config for an internal source package (packages/*). Same rules as the apps; the Pages
 * Router link rule is off because packages have no pages directory.
 * @param {{ ignores?: string[] }} [options]
 */
export function libraryConfig({ ignores = [] } = {}) {
  return [
    ...nextVitals,
    ...nextTs,
    prettier,
    shared,
    { rules: { "@next/next/no-html-link-for-pages": "off" } },
    globalIgnores([...commonIgnores, ...ignores]),
  ];
}
