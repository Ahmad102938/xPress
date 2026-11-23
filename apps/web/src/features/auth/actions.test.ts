// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- boundary mocks --------------------------------------------------------------------------
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));

let supabaseEnv = true;
vi.mock("@acurexpress/db", () => ({ hasSupabaseEnv: () => supabaseEnv, isDeployed: () => false }));

const hits: Array<{ key: string; window: number; max: number }> = [];
let limitAllows = true;
const rateLimitReset = vi.fn<(key: string) => Promise<void>>(async () => {});
const completeStepUpServer = vi.fn<(userId: string, sessionId: string) => Promise<void>>(
  async () => {},
);
vi.mock("@acurexpress/db/admin", () => ({
  rateLimitHit: async (key: string, window: number, max: number) => {
    hits.push({ key, window, max });
    return limitAllows;
  },
  rateLimitReset: (key: string) => rateLimitReset(key),
  completeStepUpServer: (userId: string, sessionId: string) =>
    completeStepUpServer(userId, sessionId),
}));

const signInWithOtp = vi.fn();
const verifyOtpCall = vi.fn();
const getUser = vi.fn();
const rpc = vi.fn();
const signOutCall = vi.fn(async () => ({ error: null }));
const signInWithOAuth = vi.fn();
const updateUser = vi.fn();
const linkIdentity = vi.fn();
vi.mock("@acurexpress/db/server", () => ({
  createOtpSenderClient: () => ({ auth: { signInWithOtp } }),
  createClient: async () => ({
    auth: {
      verifyOtp: verifyOtpCall,
      getUser,
      signOut: signOutCall,
      signInWithOAuth,
      updateUser,
      linkIdentity,
    },
    rpc,
  }),
}));

let enabled = ["phone", "email", "google"];
vi.mock("@/config/auth-methods", () => ({
  isMethodEnabled: (method: string) => enabled.includes(method),
}));

const redirect = vi.fn((target: unknown) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { target });
});
vi.mock("@/i18n/navigation", () => ({ redirect: (target: unknown) => redirect(target) }));

const authState = vi.fn(async () => ({ state: "needs_finish" }));
vi.mock("./server/auth-state", () => ({ authState: () => authState() }));

vi.spyOn(console, "info").mockImplementation(() => {});

const actions = await import("./actions");

function jwt(payload: Record<string, unknown>) {
  return `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;
}

beforeEach(() => {
  supabaseEnv = true;
  limitAllows = true;
  enabled = ["phone", "email", "google"];
  hits.length = 0;
  cookieJar.clear();
  signInWithOtp.mockResolvedValue({ data: {}, error: null });
  verifyOtpCall.mockResolvedValue({
    data: { session: { access_token: jwt({ session_id: "sess-1" }) }, user: { id: "user-1" } },
    error: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---- sending codes ---------------------------------------------------------------------------
describe("sendPhoneOtp", () => {
  it("normalises the number, applies IP, destination and cooldown limits, and sends", async () => {
    await expect(actions.sendPhoneOtp({ phone: "98765 43210" })).resolves.toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      phone: "+919876543210",
      options: { shouldCreateUser: true, channel: "sms" },
    });
    expect(hits.map((hit) => [hit.window, hit.max])).toEqual([
      [3600, 10],
      [3600, 5],
      [30, 1],
    ]);
    expect(rateLimitReset).toHaveBeenCalledOnce();
  });

  it("passes the captcha token to Supabase", async () => {
    await actions.sendPhoneOtp({ phone: "9876543210", captchaToken: "turnstile-token" });
    expect(signInWithOtp.mock.calls[0]?.[0].options.captchaToken).toBe("turnstile-token");
  });

  it("rejects a non-Indian number before any call", async () => {
    await expect(actions.sendPhoneOtp({ phone: "+14155550123" })).resolves.toEqual({
      ok: false,
      error: "invalid_input",
      issue: "invalid_phone",
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("refuses a method that AUTH_METHODS leaves out", async () => {
    enabled = ["email", "google"];
    await expect(actions.sendPhoneOtp({ phone: "9876543210" })).resolves.toEqual({
      ok: false,
      error: "method_disabled",
    });
  });

  it("is unavailable without Supabase env", async () => {
    supabaseEnv = false;
    await expect(actions.sendPhoneOtp({ phone: "9876543210" })).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("returns rate_limited when a limit is exhausted and does not call Supabase", async () => {
    limitAllows = false;
    await expect(actions.sendPhoneOtp({ phone: "9876543210" })).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("sendEmailOtp (no enumeration, R2-M18)", () => {
  it("answers a disabled sign-up exactly like a normal send", async () => {
    const normal = await actions.sendEmailOtp({ email: "existing@example.test" });
    signInWithOtp.mockResolvedValue({ data: {}, error: { code: "signup_disabled", status: 422 } });
    const newUser = await actions.sendEmailOtp({ email: "new@example.test" });
    expect(newUser).toEqual(normal);
    expect(newUser).toEqual({ ok: true });
  });

  it("maps Supabase limits to rate_limited", async () => {
    signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    await expect(actions.sendEmailOtp({ email: "a@example.test" })).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
  });

  it("never reveals an existing account", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: { code: "email_exists", status: 422 } });
    await expect(actions.sendEmailOtp({ email: "a@example.test" })).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("validates the address", async () => {
    await expect(actions.sendEmailOtp({ email: "not-an-email" })).resolves.toMatchObject({
      ok: false,
      error: "invalid_input",
    });
  });
});

// ---- verifying codes -------------------------------------------------------------------------
describe("verifyOtp", () => {
  it("signs in with a phone code and returns the gate state", async () => {
    await expect(
      actions.verifyOtp({ channel: "phone", destination: "9876543210", code: "123456" }),
    ).resolves.toEqual({
      ok: true,
      state: "needs_finish",
    });
    expect(verifyOtpCall).toHaveBeenCalledWith({
      phone: "+919876543210",
      token: "123456",
      type: "sms",
    });
    expect(cookieJar.get("acx_auth_method")).toBe("phone");
    expect(completeStepUpServer).not.toHaveBeenCalled();
  });

  it("confirms step-up on the server after an email code, for the new session", async () => {
    await actions.verifyOtp({ channel: "email", destination: "A@Example.test", code: "123456" });
    expect(verifyOtpCall).toHaveBeenCalledWith({
      email: "a@example.test",
      token: "123456",
      type: "email",
    });
    expect(completeStepUpServer).toHaveBeenCalledWith("user-1", "sess-1");
  });

  it("gives one message for a wrong or expired code", async () => {
    verifyOtpCall.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: "otp_expired", status: 403 },
    });
    await expect(
      actions.verifyOtp({ channel: "email", destination: "a@example.test", code: "000000" }),
    ).resolves.toEqual({
      ok: false,
      error: "invalid_or_expired",
    });
  });

  it("stops after five attempts without calling Supabase", async () => {
    limitAllows = false;
    await expect(
      actions.verifyOtp({ channel: "phone", destination: "9876543210", code: "123456" }),
    ).resolves.toEqual({
      ok: false,
      error: "too_many_attempts",
    });
    expect(hits[0]).toMatchObject({ window: 600, max: 5 });
    expect(verifyOtpCall).not.toHaveBeenCalled();
  });

  it("rejects a malformed code", async () => {
    await expect(
      actions.verifyOtp({ channel: "phone", destination: "9876543210", code: "12ab56" }),
    ).resolves.toMatchObject({
      ok: false,
      error: "invalid_input",
      issue: "invalid_code",
    });
  });
});

// ---- Finish sign-up --------------------------------------------------------------------------
describe("finishSignup", () => {
  const user = { id: "user-1", identities: [{ provider: "phone" }, { provider: "email" }] };

  it("calls finish_signup with the method this sign-in used", async () => {
    getUser.mockResolvedValue({ data: { user } });
    rpc.mockResolvedValue({ data: null, error: null });
    authState.mockResolvedValueOnce({ state: "signed_in" });
    cookieJar.set("acx_auth_method", "phone");
    await expect(
      actions.finishSignup({ fullName: " Asha  Devi ", marketing: false, acceptTerms: true }),
    ).resolves.toEqual({
      ok: true,
      state: "signed_in",
    });
    expect(rpc).toHaveBeenCalledWith("finish_signup", {
      p_full_name: "Asha Devi",
      p_marketing: false,
      p_source: "phone",
    });
  });

  it("ignores a remembered method the user does not have", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u", identities: [{ provider: "email" }] } } });
    rpc.mockResolvedValue({ data: null, error: null });
    cookieJar.set("acx_auth_method", "google");
    await actions.finishSignup({ fullName: "Asha Devi", marketing: true, acceptTerms: true });
    expect(rpc.mock.calls[0]?.[1].p_source).toBe("email");
  });

  it("requires the Terms box", async () => {
    await expect(
      actions.finishSignup({ fullName: "Asha Devi", marketing: false, acceptTerms: false }),
    ).resolves.toEqual({
      ok: false,
      error: "invalid_input",
      issue: "terms_required",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is refused without a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(
      actions.finishSignup({ fullName: "Asha Devi", marketing: false, acceptTerms: true }),
    ).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

// ---- step-up and sign-out --------------------------------------------------------------------
describe("step-up", () => {
  it("sends the second-factor code to the account's own email without creating users", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "a@example.test", email_confirmed_at: "x" } },
    });
    await expect(actions.sendStepUpEmailOtp()).resolves.toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "a@example.test",
      options: { shouldCreateUser: false },
    });
  });

  it("verifies the step-up code against the session's email, never one from the browser", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "a@example.test", email_confirmed_at: "x" } },
    });
    await actions.verifyStepUpEmail({ code: "123456" });
    expect(verifyOtpCall).toHaveBeenCalledWith({
      email: "a@example.test",
      token: "123456",
      type: "email",
    });
  });

  it("completeStepUp reports failure without details", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001" } });
    await expect(actions.completeStepUp()).resolves.toEqual({ ok: false, error: "unavailable" });
  });
});

describe("signOut", () => {
  it("ends this device's session only and goes Home", async () => {
    cookieJar.set("acx_auth_method", "email");
    await expect(actions.signOut()).rejects.toThrow("NEXT_REDIRECT");
    expect(signOutCall).toHaveBeenCalledWith({ scope: "local" });
    expect(cookieJar.has("acx_auth_method")).toBe(false);
    expect(redirect).toHaveBeenCalledWith({ href: "/", locale: "en" });
  });

  it("can point to Contact us (step-up 'this is a new number')", async () => {
    await expect(actions.signOut("/contact")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith({ href: "/contact", locale: "en" });
  });
});

describe("startGoogle (Milestone 5)", () => {
  it("builds the callback from NEXT_PUBLIC_SITE_URL with a sanitised next and returns Google's URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3200");
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2" },
      error: null,
    });
    await expect(actions.startGoogle({ next: "//evil.com" })).resolves.toEqual({
      ok: true,
      url: "https://accounts.google.com/o/oauth2",
    });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3200/auth/callback?next=%2F",
        skipBrowserRedirect: true,
      },
    });
    vi.unstubAllEnvs();
  });

  it("refuses when Google is not in AUTH_METHODS", async () => {
    enabled = ["phone"];
    await expect(actions.startGoogle({ next: "/" })).resolves.toEqual({
      ok: false,
      error: "method_disabled",
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});

describe("Profile actions (Milestone 6, T4, T6, T8, T9)", () => {
  beforeEach(() => {
    authState.mockResolvedValue({ state: "signed_in", user: { id: "user-1" } } as never);
    updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("adds a free phone and asks for the code", async () => {
    await expect(actions.addPhone({ phone: "9000000002" })).resolves.toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith({ phone: "+919000000002" });
    expect(hits.map((hit) => [hit.window, hit.max])).toEqual([
      [86_400, 5],
      [86_400, 20],
    ]);
  });

  it("says a taken phone is already in use and changes nothing (T4)", async () => {
    updateUser.mockResolvedValue({ data: {}, error: { code: "phone_exists", status: 422 } });
    await expect(actions.addPhone({ phone: "9000000002" })).resolves.toEqual({
      ok: false,
      error: "in_use_phone",
    });
  });

  it("says a taken email is already in use (T6)", async () => {
    updateUser.mockResolvedValue({ data: {}, error: { code: "email_exists", status: 422 } });
    await expect(actions.addEmail({ email: "b@example.test" })).resolves.toEqual({
      ok: false,
      error: "in_use_email",
    });
  });

  it("is rate limited per user and per IP (T9)", async () => {
    limitAllows = false;
    await expect(actions.addEmail({ email: "b@example.test" })).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("requires a fully signed-in patient", async () => {
    authState.mockResolvedValue({ state: "needs_finish", user: { id: "user-1" } } as never);
    await expect(actions.addPhone({ phone: "9000000002" })).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("confirms a pending phone with type phone_change; a raced code fails generically (T8)", async () => {
    verifyOtpCall.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403 } });
    await expect(actions.verifyAddPhone({ phone: "9000000002", code: "123456" })).resolves.toEqual({
      ok: false,
      error: "invalid_or_expired",
    });
    expect(verifyOtpCall).toHaveBeenCalledWith({
      phone: "+919000000002",
      token: "123456",
      type: "phone_change",
    });
  });

  it("confirms a pending email with type email_change", async () => {
    verifyOtpCall.mockResolvedValue({ data: {}, error: null });
    await expect(
      actions.verifyAddEmail({ email: "B@example.test", code: "654321" }),
    ).resolves.toEqual({ ok: true });
    expect(verifyOtpCall).toHaveBeenCalledWith({
      email: "b@example.test",
      token: "654321",
      type: "email_change",
    });
  });

  it("connects Google in link mode back to Profile", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3200");
    linkIdentity.mockResolvedValue({
      data: { url: "https://accounts.google.com/link" },
      error: null,
    });
    await expect(actions.connectGoogle()).resolves.toEqual({
      ok: true,
      url: "https://accounts.google.com/link",
    });
    expect(linkIdentity).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3200/auth/callback?flow=link&next=%2Faccount",
        skipBrowserRedirect: true,
      },
    });
    vi.unstubAllEnvs();
  });

  it("records a marketing change through record_consent", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(actions.setMarketing({ granted: true })).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("record_consent", { p_granted: true });
  });
});
