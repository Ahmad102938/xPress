"use server";

import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import {
  finishSignupInput,
  isSilentSendSuccess,
  mapSupabaseAuthError,
  otpCodeSchema,
  sanitizeNextPath,
  sendEmailOtpInput,
  sendPhoneOtpInput,
  verifyOtpInput,
  type AuthErrorKey,
  type AuthMethodId,
  type SignInErrorKey,
} from "@acurexpress/core";
import { hasSupabaseEnv, type User } from "@acurexpress/db";
import { completeStepUpServer, rateLimitHit, rateLimitReset } from "@acurexpress/db/admin";
import { createClient, createOtpSenderClient } from "@acurexpress/db/server";
import { isMethodEnabled } from "@/config/auth-methods";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";
import { logAuthEvent, type AuthEvent } from "@/lib/log";
import { authState, type GateState } from "./server/auth-state";
import { METHOD_COOKIE, methodCookie } from "./server/method-cookie";
import { allow, clientIp, limiterKey, type Limiter, type LimitName } from "./server/rate-limit";

/**
 * Sign-in server actions (docs/specs/auth.md Part B, Review Logs). Every action re-checks
 * AUTH_METHODS and its limits, validates with the core schemas and returns a closed result.
 * Sign-in results never tell an existing account from a new one.
 */

export type ActionError = AuthErrorKey | "invalid_input";
export type SendResult = { ok: true } | { ok: false; error: ActionError; issue?: string };
export type StateResult =
  { ok: true; state: GateState } | { ok: false; error: ActionError; issue?: string };

const limiter: Limiter = { hit: rateLimitHit, reset: rateLimitReset };

async function locale(): Promise<Locale> {
  try {
    const value = await getLocale();
    return (routing.locales as readonly string[]).includes(value)
      ? (value as Locale)
      : routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

async function fail<T extends { ok: false; error: ActionError }>(
  event: AuthEvent,
  method: AuthMethodId | "none",
  error: ActionError,
  issue?: string,
): Promise<T> {
  logAuthEvent(event, { method, outcome: error, locale: await locale() });
  return (issue ? { ok: false, error, issue } : { ok: false, error }) as T;
}

function guard(method: AuthMethodId): SignInErrorKey | null {
  if (!isMethodEnabled(method)) return "method_disabled";
  if (!hasSupabaseEnv()) return "unavailable";
  return null;
}

/** Counts the given limits; a limiter failure fails closed as "unavailable". */
async function within(
  checks: ReadonlyArray<{ limit: LimitName; key: string }>,
): Promise<boolean | "error"> {
  try {
    return await allow(limiter, checks);
  } catch {
    return "error";
  }
}

function sessionIdFrom(accessToken: string): string | null {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString(),
    );
    const id = (payload as { session_id?: unknown }).session_id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

/** Remembers which method this sign-in used, for the consent source (validated by the database). */
async function rememberMethod(method: AuthMethodId) {
  const cookie = methodCookie(method);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
}

async function sendCode(
  method: "phone" | "email",
  destination: string,
  captchaToken: string | undefined,
  shouldCreateUser: boolean,
): Promise<SendResult> {
  const ip = clientIp(await headers());
  const allowed = await within([
    { limit: "sendPerIp", key: limiterKey("ip", ip) },
    { limit: "sendPerDestination", key: limiterKey("dest", destination) },
    { limit: "resendCooldown", key: limiterKey("resend", destination) },
  ]);
  if (allowed === "error") return fail("auth.otp_send", method, "unavailable");
  if (!allowed) return fail("auth.otp_send", method, "rate_limited");

  const sender = createOtpSenderClient();
  const options = { shouldCreateUser, ...(captchaToken ? { captchaToken } : {}) };
  const { error } =
    method === "phone"
      ? await sender.auth.signInWithOtp({
          phone: destination,
          options: { ...options, channel: "sms" },
        })
      : await sender.auth.signInWithOtp({ email: destination, options });

  if (error && !isSilentSendSuccess(error)) {
    return fail("auth.otp_send", method, mapSupabaseAuthError(error, "send"));
  }

  // A new code was sent: the verify-attempt counter for this destination starts again (R1-M8).
  try {
    await limiter.reset(limiterKey("verify", destination));
  } catch {
    // The counter expires on its own after 10 minutes.
  }
  logAuthEvent("auth.otp_send", { method, outcome: "ok", locale: await locale() });
  return { ok: true };
}

export async function sendPhoneOtp(input: {
  phone: string;
  captchaToken?: string;
}): Promise<SendResult> {
  const blocked = guard("phone");
  if (blocked) return fail("auth.otp_send", "phone", blocked);
  const parsed = sendPhoneOtpInput.safeParse(input);
  if (!parsed.success)
    return fail("auth.otp_send", "phone", "invalid_input", parsed.error.issues[0]?.message);
  return sendCode("phone", parsed.data.phone, parsed.data.captchaToken, true);
}

export async function sendEmailOtp(input: {
  email: string;
  captchaToken?: string;
}): Promise<SendResult> {
  const blocked = guard("email");
  if (blocked) return fail("auth.otp_send", "email", blocked);
  const parsed = sendEmailOtpInput.safeParse(input);
  if (!parsed.success)
    return fail("auth.otp_send", "email", "invalid_input", parsed.error.issues[0]?.message);
  return sendCode("email", parsed.data.email, parsed.data.captchaToken, true);
}

async function verifyCode(
  method: "phone" | "email",
  destination: string,
  code: string,
): Promise<StateResult> {
  const allowed = await within([
    { limit: "verifyPerDestination", key: limiterKey("verify", destination) },
  ]);
  if (allowed === "error") return fail("auth.otp_verify", method, "unavailable");
  if (!allowed) return fail("auth.otp_verify", method, "too_many_attempts");

  const supabase = await createClient();
  const { data, error } =
    method === "phone"
      ? await supabase.auth.verifyOtp({ phone: destination, token: code, type: "sms" })
      : await supabase.auth.verifyOtp({ email: destination, token: code, type: "email" });

  if (error || !data.session || !data.user) {
    return fail(
      "auth.otp_verify",
      method,
      error ? mapSupabaseAuthError(error, "verify") : "invalid_or_expired",
    );
  }

  await rememberMethod(method);

  // An email code proves the account's email: the server confirms step-up for this new session
  // (owner decision on OQ7). It does nothing when no step-up is needed.
  if (method === "email") {
    const sessionId = sessionIdFrom(data.session.access_token);
    if (sessionId) {
      try {
        await completeStepUpServer(data.user.id, sessionId);
      } catch {
        // The gate keeps showing step-up; the user can retry.
      }
    }
  }

  const auth = await authState(supabase);
  logAuthEvent("auth.otp_verify", { method, outcome: "ok", locale: await locale() });
  return { ok: true, state: auth.state };
}

export async function verifyOtp(input: {
  channel: "phone" | "email";
  destination: string;
  code: string;
}): Promise<StateResult> {
  const method = input.channel === "phone" ? "phone" : "email";
  const blocked = guard(method);
  if (blocked) return fail("auth.otp_verify", method, blocked);
  const parsed = verifyOtpInput.safeParse(input);
  if (!parsed.success)
    return fail("auth.otp_verify", method, "invalid_input", parsed.error.issues[0]?.message);
  return verifyCode(method, parsed.data.destination, parsed.data.code);
}

function sourceFor(user: User, remembered: string | undefined): AuthMethodId | null {
  const providers = new Set((user.identities ?? []).map((identity) => identity.provider));
  if (
    (remembered === "phone" || remembered === "email" || remembered === "google") &&
    providers.has(remembered)
  ) {
    return remembered;
  }
  for (const method of ["google", "email", "phone"] as const) {
    if (providers.has(method)) return method;
  }
  return null;
}

export async function finishSignup(input: {
  fullName: string;
  marketing: boolean;
  acceptTerms: boolean;
}): Promise<StateResult> {
  if (!hasSupabaseEnv()) return fail("auth.finish_signup", "none", "unavailable");
  const parsed = finishSignupInput.safeParse(input);
  if (!parsed.success)
    return fail("auth.finish_signup", "none", "invalid_input", parsed.error.issues[0]?.message);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("auth.finish_signup", "none", "unavailable");

  const source = sourceFor(data.user, (await cookies()).get(METHOD_COOKIE)?.value);
  if (!source) return fail("auth.finish_signup", "none", "unavailable");

  const { error } = await supabase.rpc("finish_signup", {
    p_full_name: parsed.data.fullName,
    p_marketing: parsed.data.marketing,
    p_source: source,
  });
  if (error) {
    // Error code only (e.g. PGRST202 = function missing: wrong Supabase project or migrations not
    // applied). Never the name, contacts or user id.
    console.error(`[auth] finish_signup failed (${error.code ?? "unknown"})`);
    return fail("auth.finish_signup", source, "unavailable");
  }

  const auth = await authState(supabase);
  logAuthEvent("auth.finish_signup", { method: source, outcome: "ok", locale: await locale() });
  return { ok: true, state: auth.state };
}

/** Clears step-up for a Google session or the phone-only "Yes, this is my account" choice. */
export async function completeStepUp(): Promise<StateResult> {
  if (!hasSupabaseEnv()) return fail("auth.step_up", "none", "unavailable");
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_step_up");
  if (error) return fail("auth.step_up", "none", "unavailable");
  const auth = await authState(supabase);
  logAuthEvent("auth.step_up", { outcome: "ok", locale: await locale() });
  return { ok: true, state: auth.state };
}

/** Sends a code to the signed-in account's own email (step-up second factor). */
export async function sendStepUpEmailOtp(): Promise<SendResult> {
  const blocked = guard("email");
  if (blocked) return fail("auth.step_up", "email", blocked);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email_confirmed_at ? data.user.email : undefined;
  if (!email) return fail("auth.step_up", "email", "unavailable");
  return sendCode("email", email, undefined, false);
}

/** Verifies the step-up email code; the address comes from the session, never from the browser. */
export async function verifyStepUpEmail(input: { code: string }): Promise<StateResult> {
  const blocked = guard("email");
  if (blocked) return fail("auth.step_up", "email", blocked);
  const code = otpCodeSchema.safeParse(input.code);
  if (!code.success)
    return fail("auth.step_up", "email", "invalid_input", code.error.issues[0]?.message);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email_confirmed_at ? data.user.email : undefined;
  if (!email) return fail("auth.step_up", "email", "unavailable");
  return verifyCode("email", email, code.data);
}

/** Ends the session on this device only (N4) and goes to Home or Contact us. POST by nature. */
export async function signOut(destination: "/" | "/contact" = "/"): Promise<never> {
  const target = destination === "/contact" ? "/contact" : "/";
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  (await cookies()).delete(METHOD_COOKIE);
  logAuthEvent("auth.sign_out", { outcome: "ok", locale: await locale() });
  return redirect({ href: target, locale: await locale() });
}

/** What the step-up screen may offer this account (masked email, Google), for the signed-in user. */
export async function stepUpOptions(): Promise<{ maskedEmail: string | null; google: boolean }> {
  if (!hasSupabaseEnv()) return { maskedEmail: null, google: false };
  const auth = await authState();
  return auth.state === "step_up" ? auth.stepUp : { maskedEmail: null, google: false };
}

// ---- Google (Milestone 5) --------------------------------------------------------------------

export type RedirectResult = { ok: true; url: string } | { ok: false; error: ActionError };

/**
 * Starts Google sign-in with PKCE on the cookie client (the verifier cookie is set here) and
 * returns Google's URL for the browser to follow. `next` is sanitised again in the callback.
 */
export async function startGoogle(input: { next?: string }): Promise<RedirectResult> {
  const blocked = guard("google");
  if (blocked) return fail("auth.oauth_callback", "google", blocked);
  const next = sanitizeNextPath(input.next, routing.locales);
  const callback = new URL("/auth/callback", siteUrl());
  callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url)
    return fail(
      "auth.oauth_callback",
      "google",
      error ? mapSupabaseAuthError(error, "oauth") : "unavailable",
    );
  return { ok: true, url: data.url };
}

// ---- Profile: contacts, Google, marketing (Milestone 6, Part C) ------------------------------

export type ProfileResult = { ok: true } | { ok: false; error: ActionError; issue?: string };
export type LinkResult = { ok: true; url: string } | { ok: false; error: ActionError };

/** Profile actions need a fully signed-in patient and the per-user and per-IP daily limits. */
async function profileGuard(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: ActionError }
> {
  if (!hasSupabaseEnv()) return { ok: false, error: "unavailable" };
  const supabase = await createClient();
  const auth = await authState(supabase);
  if (auth.state !== "signed_in" || !auth.user) return { ok: false, error: "unavailable" };
  return { ok: true, supabase, userId: auth.user.id };
}

async function profileLimits(userId: string): Promise<ActionError | null> {
  const ip = clientIp(await headers());
  const allowed = await within([
    { limit: "profileAddPerUser", key: limiterKey("user", userId) },
    { limit: "profileAddPerIp", key: limiterKey("profile-ip", ip) },
  ]);
  if (allowed === "error") return "unavailable";
  return allowed ? null : "rate_limited";
}

/** Add phone (CUJ 6): "already in use" shows before any code (accepted Supabase order). */
export async function addPhone(input: { phone: string }): Promise<ProfileResult> {
  const parsed = sendPhoneOtpInput.safeParse({ phone: input.phone });
  if (!parsed.success)
    return fail("auth.contact_change", "phone", "invalid_input", parsed.error.issues[0]?.message);
  const ctx = await profileGuard();
  if (!ctx.ok) return fail("auth.contact_change", "phone", ctx.error);
  const limited = await profileLimits(ctx.userId);
  if (limited) return fail("auth.contact_change", "phone", limited);

  const { error } = await ctx.supabase.auth.updateUser({ phone: parsed.data.phone });
  if (error) return fail("auth.contact_change", "phone", mapSupabaseAuthError(error, "profile"));
  try {
    await limiter.reset(limiterKey("verify", parsed.data.phone));
  } catch {
    // expires on its own
  }
  logAuthEvent("auth.contact_change", { method: "phone", outcome: "ok", locale: await locale() });
  return { ok: true };
}

/** Confirms the pending phone (type phone_change). A raced or expired code never attaches it (CUJ 9). */
export async function verifyAddPhone(input: {
  phone: string;
  code: string;
}): Promise<ProfileResult> {
  const parsed = verifyOtpInput.safeParse({
    channel: "phone",
    destination: input.phone,
    code: input.code,
  });
  if (!parsed.success)
    return fail("auth.contact_change", "phone", "invalid_input", parsed.error.issues[0]?.message);
  const ctx = await profileGuard();
  if (!ctx.ok) return fail("auth.contact_change", "phone", ctx.error);
  const allowed = await within([
    { limit: "verifyPerDestination", key: limiterKey("verify", parsed.data.destination) },
  ]);
  if (allowed === "error") return fail("auth.contact_change", "phone", "unavailable");
  if (!allowed) return fail("auth.contact_change", "phone", "too_many_attempts");

  const { error } = await ctx.supabase.auth.verifyOtp({
    phone: parsed.data.destination,
    token: parsed.data.code,
    type: "phone_change",
  });
  if (error) return fail("auth.contact_change", "phone", mapSupabaseAuthError(error, "profile"));
  logAuthEvent("auth.contact_change", { method: "phone", outcome: "ok", locale: await locale() });
  return { ok: true };
}

/** Add email (CUJ 7). */
export async function addEmail(input: { email: string }): Promise<ProfileResult> {
  const parsed = sendEmailOtpInput.safeParse({ email: input.email });
  if (!parsed.success)
    return fail("auth.contact_change", "email", "invalid_input", parsed.error.issues[0]?.message);
  const ctx = await profileGuard();
  if (!ctx.ok) return fail("auth.contact_change", "email", ctx.error);
  const limited = await profileLimits(ctx.userId);
  if (limited) return fail("auth.contact_change", "email", limited);

  const { error } = await ctx.supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return fail("auth.contact_change", "email", mapSupabaseAuthError(error, "profile"));
  try {
    await limiter.reset(limiterKey("verify", parsed.data.email));
  } catch {
    // expires on its own
  }
  logAuthEvent("auth.contact_change", { method: "email", outcome: "ok", locale: await locale() });
  return { ok: true };
}

export async function verifyAddEmail(input: {
  email: string;
  code: string;
}): Promise<ProfileResult> {
  const parsed = verifyOtpInput.safeParse({
    channel: "email",
    destination: input.email,
    code: input.code,
  });
  if (!parsed.success)
    return fail("auth.contact_change", "email", "invalid_input", parsed.error.issues[0]?.message);
  const ctx = await profileGuard();
  if (!ctx.ok) return fail("auth.contact_change", "email", ctx.error);
  const allowed = await within([
    { limit: "verifyPerDestination", key: limiterKey("verify", parsed.data.destination) },
  ]);
  if (allowed === "error") return fail("auth.contact_change", "email", "unavailable");
  if (!allowed) return fail("auth.contact_change", "email", "too_many_attempts");

  const { error } = await ctx.supabase.auth.verifyOtp({
    email: parsed.data.destination,
    token: parsed.data.code,
    type: "email_change",
  });
  if (error) return fail("auth.contact_change", "email", mapSupabaseAuthError(error, "profile"));
  logAuthEvent("auth.contact_change", { method: "email", outcome: "ok", locale: await locale() });
  return { ok: true };
}

/** Connect Google (CUJ 8): manual linking; the callback runs in link mode and returns to Profile. */
export async function connectGoogle(): Promise<LinkResult> {
  if (!isMethodEnabled("google")) return fail("auth.link_identity", "google", "method_disabled");
  const ctx = await profileGuard();
  if (!ctx.ok) return fail("auth.link_identity", "google", ctx.error);
  const current = await locale();
  const callback = new URL("/auth/callback", siteUrl());
  callback.searchParams.set("flow", "link");
  callback.searchParams.set(
    "next",
    current === routing.defaultLocale ? "/account" : `/${current}/account`,
  );

  const { data, error } = await ctx.supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return fail(
      "auth.link_identity",
      "google",
      error ? mapSupabaseAuthError(error, "profile") : "unavailable",
    );
  }
  return { ok: true, url: data.url };
}

/** Marketing choice from Profile: a new consent row only when it changes (record_consent). */
export async function setMarketing(input: { granted: boolean }): Promise<ProfileResult> {
  if (typeof input.granted !== "boolean") return { ok: false, error: "invalid_input" };
  const ctx = await profileGuard();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.rpc("record_consent", { p_granted: input.granted });
  if (error) return { ok: false, error: "unavailable" };
  return { ok: true };
}
