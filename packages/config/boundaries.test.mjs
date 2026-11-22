import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { libraryConfig, nextAppConfig } from "./eslint.mjs";

/** Lints a snippet as if it lived at `filePath` (relative to the repo root). */
async function boundaryErrors(config, filePath, code) {
  const eslint = new ESLint({
    cwd: new URL("../..", import.meta.url).pathname,
    overrideConfigFile: true,
    overrideConfig: config,
  });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);
}

const app = nextAppConfig();
const library = libraryConfig();

describe("workspace boundaries", () => {
  it("stops an app importing from another app", async () => {
    const byName = await boundaryErrors(
      app,
      "apps/partner/src/x.ts",
      'import { x } from "@acurexpress/web";\n',
    );
    const byPath = await boundaryErrors(
      app,
      "apps/partner/src/x.ts",
      'import { x } from "../../web/src/lib/mock";\nimport { y } from "../../../apps/web/src/y";\n',
    );
    expect(byName).toHaveLength(1);
    expect(byPath.length).toBeGreaterThanOrEqual(1);
    expect(byName[0]).toMatch(/never import from an app/);
  });

  it("stops a package importing from an app or using the app alias", async () => {
    const errors = await boundaryErrors(
      library,
      "packages/ui/src/x.ts",
      'import { a } from "@acurexpress/web";\nimport { b } from "../../../apps/web/src/b";\nimport { c } from "@/lib/c";\n',
    );
    expect(errors).toHaveLength(3);
  });

  it("stops deep imports into a package's internals", async () => {
    const errors = await boundaryErrors(
      app,
      "apps/web/src/x.ts",
      'import { a } from "@acurexpress/ui/src/lib/utils";\nimport { b } from "../../../packages/core/src/flags";\n',
    );
    expect(errors).toHaveLength(2);
  });

  it("allows public entry points and app-internal imports", async () => {
    const errors = await boundaryErrors(
      app,
      "apps/web/src/x.ts",
      [
        'import { Button } from "@acurexpress/ui";',
        'import { getFlags } from "@acurexpress/core";',
        'import { createClient } from "@acurexpress/db/server";',
        'import { cn } from "@/lib/utils";',
        'import { y } from "./y";',
        "",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
  });
});
