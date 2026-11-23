#!/usr/bin/env node
// Creates the LOCAL JWT signing key file supabase/signing_keys.json once (docs/specs/auth.md R2-M21).
// The CLI prints one JWK; config.toml `signing_keys_path` expects a JSON array. The file is
// git-ignored (supabase/.gitignore) and its contents are never printed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "supabase", "signing_keys.json");

if (existsSync(target)) {
  process.exit(0);
}

// Run outside the project: config.toml already points at the (missing) key file, which the CLI
// would fail to read while loading config.
const cli = path.join(root, "node_modules", ".bin", "supabase");
const scratch = mkdtempSync(path.join(os.tmpdir(), "acx-keys-"));
let out;
try {
  out = execFileSync(cli, ["gen", "signing-key", "--algorithm", "ES256", "--workdir", scratch], {
    cwd: scratch,
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
const parsed = JSON.parse(out);
const keys = Array.isArray(parsed) ? parsed : [parsed];
writeFileSync(target, `${JSON.stringify(keys, null, 2)}\n`, { mode: 0o600 });
console.log("Created supabase/signing_keys.json (local only, git-ignored).");
