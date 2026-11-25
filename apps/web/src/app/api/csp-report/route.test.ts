// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let allowed: boolean | "error" = true;
vi.mock("@/features/auth/server/limiter", () => ({ within: async () => allowed }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const info = vi.spyOn(console, "info").mockImplementation(() => {});

const { POST } = await import("./route");

function report(body: unknown, type = "application/csp-report") {
  return new Request("http://localhost:3000/api/csp-report", {
    method: "POST",
    headers: { "content-type": type },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const logged = () =>
  info.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);

beforeEach(() => {
  allowed = true;
});
afterEach(() => info.mockClear());

describe("/api/csp-report", () => {
  it("logs only the directive and the blocked origin of a legacy report", async () => {
    const response = await POST(
      report({
        "csp-report": {
          "document-uri":
            "https://acurexpress.com/appointments/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f?x=1",
          "effective-directive": "script-src-elem",
          "blocked-uri": "https://evil.example.test/x.js?token=abc",
          "script-sample": "alert(document.cookie)",
        },
      }),
    );
    expect(response.status).toBe(204);
    expect(logged()).toEqual([
      {
        event: "csp.report",
        outcome: "ok",
        directive: "script-src-elem",
        blockedOrigin: "https://evil.example.test",
      },
    ]);
    expect(JSON.stringify(logged())).not.toMatch(/appointments|token|alert/);
  });

  it("reads Reporting API lists", async () => {
    await POST(
      report(
        [
          {
            type: "csp-violation",
            body: { effectiveDirective: "img-src", blockedURL: "https://img.example.test/a.png" },
          },
        ],
        "application/reports+json",
      ),
    );
    expect(logged()).toEqual([
      {
        event: "csp.report",
        outcome: "ok",
        directive: "img-src",
        blockedOrigin: "https://img.example.test",
      },
    ]);
  });

  it("ignores other content types, oversized bodies and bad JSON", async () => {
    expect((await POST(report({}, "text/plain"))).status).toBe(204);
    expect((await POST(report("x".repeat(9000)))).status).toBe(204);
    expect((await POST(report("{not json"))).status).toBe(204);
    expect(logged()).toEqual([]);
  });

  it("drops reports once the per-IP limit is reached", async () => {
    allowed = false;
    await POST(report({ "csp-report": { "effective-directive": "script-src" } }));
    expect(logged()).toEqual([]);
  });
});
