// Runs from the repo root (husky pre-commit). ESLint configs live in each workspace, so staged
// files are grouped by workspace and linted with that workspace's config and plugins.
import path from "node:path";

const WORKSPACES = /^(apps|packages)\/[^/]+\//;
const quote = (files) => files.map((f) => JSON.stringify(f)).join(" ");

function eslintByWorkspace(files) {
  const groups = new Map();
  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const match = rel.match(WORKSPACES);
    if (!match) continue; // root-level scripts and configs: Prettier only
    const dir = match[0].slice(0, -1);
    groups.set(dir, [...(groups.get(dir) ?? []), file]);
  }
  return [...groups].map(([dir, list]) => `pnpm --dir ${dir} exec eslint --fix ${quote(list)}`);
}

export default {
  "*.{ts,tsx,js,mjs,cjs}": (files) => [
    ...eslintByWorkspace(files),
    `prettier --write ${quote(files)}`,
  ],
  "*.{json,md,css,yml,yaml}": (files) => `prettier --write ${quote(files)}`,
};
