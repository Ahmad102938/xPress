import { headers } from "next/headers";
import { within } from "@/features/auth/server/limiter";
import { clientIp, limiterKey } from "@/features/auth/server/rate-limit";
import { logAuthEvent } from "@/lib/log";

/**
 * CSP violation reports (docs/specs/signed-in-home.md item 26). Accepts the old
 * `application/csp-report` body and the Reporting API `application/reports+json` list, up to 8 KB,
 * rate limited per IP. Logs only the directive and the blocked origin (scheme + host), never the
 * page URL, query string or sample. Always 204, so it tells a sender nothing.
 */

const MAX_BYTES = 8 * 1024;
const NO_CONTENT = () => new Response(null, { status: 204 });

interface Violation {
  directive?: string;
  blocked?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseViolations(body: unknown): Violation[] {
  const legacy = asRecord(asRecord(body)?.["csp-report"]);
  if (legacy) {
    return [
      {
        directive: str(legacy["effective-directive"]) ?? str(legacy["violated-directive"]),
        blocked: str(legacy["blocked-uri"]),
      },
    ];
  }
  if (Array.isArray(body)) {
    return body.slice(0, 10).flatMap((item) => {
      const report = asRecord(item);
      const payload = asRecord(report?.body);
      if (report?.type !== "csp-violation" || !payload) return [];
      return [{ directive: str(payload.effectiveDirective), blocked: str(payload.blockedURL) }];
    });
  }
  return [];
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/csp-report") && !type.includes("application/reports+json"))
    return NO_CONTENT();
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BYTES) return NO_CONTENT();

  const allowed = await within([
    { limit: "cspReportPerIp", key: limiterKey("csp-ip", clientIp(await headers())) },
  ]);
  if (allowed !== true) return NO_CONTENT();

  let text: string;
  try {
    text = await request.text();
  } catch {
    return NO_CONTENT();
  }
  if (text.length > MAX_BYTES) return NO_CONTENT();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NO_CONTENT();
  }
  for (const violation of parseViolations(body)) {
    logAuthEvent("csp.report", {
      outcome: "ok",
      ...(violation.directive ? { directive: violation.directive } : {}),
      ...(violation.blocked ? { blockedOrigin: violation.blocked } : {}),
    });
  }
  return NO_CONTENT();
}
