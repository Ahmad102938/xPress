// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const rpc = vi.fn(async () => ({ data: null, error: null }));
const authState = vi.fn();
const cookieSet = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("@acurexpress/db", () => ({ hasSupabaseEnv: () => true, isDeployed: () => false }));
vi.mock("@acurexpress/db/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession }, rpc }),
}));
vi.mock("@/features/auth/server/auth-state", () => ({ authState: () => authState() }));
vi.spyOn(console, "info").mockImplementation(() => {});

const { GET } = await import("./route");

function call(query: string) {
  return GET(new NextRequest(`http://evil-host.example/auth/callback?${query}`));
}

function location(response: Response) {
  const url = new URL(response.headers.get("location") ?? "");
  return `${url.origin}${url.pathname}${url.search}`;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3200");
  exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  authState.mockResolvedValue({ state: "signed_in" });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("/auth/callback: Google sign-in", () => {
  it("returns a signed-in patient to the sanitised next on the site's own origin", async () => {
    const response = await call("code=abc&next=%2Fdoctors%3Fpage%3D2");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(response)).toBe("http://localhost:3200/doctors?page=2");
    expect(cookieSet).toHaveBeenCalledWith(
      "acx_auth_method",
      "google",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("never redirects off-site", async () => {
    expect(location(await call("code=abc&next=%2F%2Fevil.com"))).toBe("http://localhost:3200/");
  });

  it("opens Finish sign-up when consent is missing", async () => {
    authState.mockResolvedValue({ state: "needs_finish" });
    expect(location(await call("code=abc&next=%2Faccount"))).toBe(
      "http://localhost:3200/account?login=1&step=finish",
    );
  });

  it("lets a Google session clear its own step-up", async () => {
    authState
      .mockResolvedValueOnce({ state: "step_up" })
      .mockResolvedValueOnce({ state: "signed_in" });
    expect(location(await call("code=abc&next=%2Faccount"))).toBe("http://localhost:3200/account");
    expect(rpc).toHaveBeenCalledWith("complete_step_up");
  });

  it("reports a missing PKCE verifier as a generic failure", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: { code: "bad_code_verifier" } });
    expect(location(await call("code=abc&next=%2F"))).toBe(
      "http://localhost:3200/?login=1&error=unavailable",
    );
  });

  it("reopens the panel without an error when the user cancels at Google", async () => {
    expect(location(await call("error=access_denied&next=%2Fdoctors"))).toBe(
      "http://localhost:3200/doctors?login=1",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails safely without a code", async () => {
    expect(location(await call("next=%2F"))).toBe(
      "http://localhost:3200/?login=1&error=unavailable",
    );
  });

  it("does not reveal an existing account on sign-in", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { code: "identity_already_exists" },
    });
    expect(location(await call("code=abc"))).toBe(
      "http://localhost:3200/?login=1&error=unavailable",
    );
  });
});

describe("/auth/callback: connect Google from Profile (flow=link)", () => {
  it("returns to Profile with Google listed", async () => {
    expect(location(await call("code=abc&flow=link&next=%2Fhi%2Faccount"))).toBe(
      "http://localhost:3200/hi/account?link=google",
    );
    expect(authState).not.toHaveBeenCalled();
  });

  it("says the Google account is already in use", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { code: "identity_already_exists" },
    });
    expect(location(await call("code=abc&flow=link&next=%2Faccount"))).toBe(
      "http://localhost:3200/account?link=in_use_google",
    );
  });

  it("changes nothing when the user cancels at Google", async () => {
    expect(location(await call("error=access_denied&flow=link&next=%2Faccount"))).toBe(
      "http://localhost:3200/account?link=cancelled",
    );
  });
});
