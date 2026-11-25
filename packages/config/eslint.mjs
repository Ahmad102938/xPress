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
  ".next-auth/**",
  ".next-dev-fixtures/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  "playwright-report/**",
  "test-results/**",
  "**/database.types.ts",
];

/*
 * Workspace boundaries (CLAUDE.md "Package boundaries"):
 *  - apps import only from packages, never from each other;
 *  - packages never import from apps;
 *  - everyone imports a package through its declared entry points, never its src/ internals.
 */
const APP_PACKAGES = ["@acurexpress/web", "@acurexpress/partner", "@acurexpress/admin"];

const noAppImports = {
  group: [...APP_PACKAGES, ...APP_PACKAGES.map((name) => `${name}/*`), "**/apps/**"],
  message:
    "Workspace boundary: never import from an app. Move shared code into a package under packages/.",
};

const noDeepPackageImports = {
  group: ["@acurexpress/*/src", "@acurexpress/*/src/**", "**/packages/**"],
  message:
    "Workspace boundary: import a package by its name and public entry points (its index.ts or package.json exports), not its files.",
};

const noAppAlias = {
  group: ["@/*"],
  message:
    "Workspace boundary: `@/` is an app-only alias. Packages use relative imports inside the package.",
};

export const appBoundaryRule = {
  "no-restricted-imports": ["error", { patterns: [noAppImports, noDeepPackageImports] }],
};

export const libraryBoundaryRule = {
  "no-restricted-imports": [
    "error",
    { patterns: [noAppImports, noDeepPackageImports, noAppAlias] },
  ],
};

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
    { rules: appBoundaryRule },
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
    { rules: { "@next/next/no-html-link-for-pages": "off", ...libraryBoundaryRule } },
    globalIgnores([...commonIgnores, ...ignores]),
  ];
}
