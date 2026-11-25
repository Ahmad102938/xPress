#!/usr/bin/env node
// Fails the build if the dev-only home fixtures reached the output (docs/specs/signed-in-home.md
// item 59). Reads NEXT_DIST_DIR like check-prerender.mjs. Skipped for `next dev` folders, where
// fixtures are allowed by design.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MARKER = "ACX_DEV_FIXTURE_DATA";
const dist = process.env.NEXT_DIST_DIR ?? ".next";
const roots = ["server", "static"].map((dir) => join(dist, dir)).filter((dir) => existsSync(dir));

if (roots.length === 0) {
  console.error(`check-no-fixtures: no build output in ${dist}`);
  process.exit(1);
}

const hits = [];
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) scan(path);
    else if (/\.(js|mjs|cjs|html|rsc|json|body)$/.test(name) && stat.size < 20_000_000) {
      if (readFileSync(path, "utf8").includes(MARKER)) hits.push(path);
    }
  }
}
for (const root of roots) scan(root);

if (hits.length > 0) {
  console.error(
    `check-no-fixtures: dev fixtures found in the production build:\n  ${hits.join("\n  ")}`,
  );
  process.exit(1);
}
console.warn(`check-no-fixtures: OK (${dist})`);
