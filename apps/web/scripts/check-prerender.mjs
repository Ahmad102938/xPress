#!/usr/bin/env node
// Asserts Home is still prerendered after `pnpm build` (docs/specs/auth.md R2-M17). Run after a
// build: `pnpm --filter @acurexpress/web test:prerender`. Reads .next (or NEXT_DIST_DIR).
import { readFileSync } from "node:fs";
import path from "node:path";

const dist = process.env.NEXT_DIST_DIR ?? ".next";
const manifest = JSON.parse(readFileSync(path.join(dist, "prerender-manifest.json"), "utf8"));
const missing = ["/en", "/hi"].filter((route) => !(route in manifest.routes));
if (missing.length > 0) {
  console.error(`Not prerendered: ${missing.join(", ")}`);
  process.exit(1);
}
console.warn("OK: Home is prerendered for /en and /hi.");
