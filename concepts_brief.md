# Patient sign-in and sign-up (apps/web)

- **Author:** Ahmad102938
- **Date:** 2026-11-23

## Overview

Patients sign in or sign up on the patient site through one shared panel: a side drawer on desktop, a bottom sheet on mobile, and the same component on a `/login` page.

Methods:

- **Phone one-time code: the primary method** (Product Context §24). It is the default and comes first in the UI whenever it is enabled.
- **Email one-time code (Brevo).** Configured now because DLT registration for SMS (MSG91) is still pending.
- **Google**, as an additional option.

The project is in development. `AUTH_METHODS` decides per environment which methods appear:

- local: `phone,email,google`;
- deployed environments: `email,google` until DLT is approved, then phone is added.

**Consent** is collected on a **Finish sign-up** screen shown after the code or Google step, to anyone with no consent for the current Terms version. The screen has the required unticked "I am 18 or older and agree to the Terms of use and Privacy policy" box, the optional unticked marketing box and the name. It is saved through a database function that takes no version from the caller. The first screen has no checkboxes. The sign-in screens never reveal whether an account exists.

Identity rules (owner decisions, v1):

- Google and email are one identity: the same verified email through either resolves to one account.
- Phone is a separate identity and is never linked automatically.
- In Profile, a signed-in user can add a phone, add an email, or connect Google.
- If that phone or email belongs to another account, the user sees "already in use" and nothing is merged. Supabase checks ownership before sending the code, so the add flows reveal that a contact is registered. This is an accepted v1 limitation, mitigated by rate limits.
- A person with a phone account and a separate Google/email account has two accounts. There is no merge in v1.

Data lives in a minimal identity slice on local Supabase: an `app_role` type, `profiles`, `user_roles` and an append-only `consents` table, with row-level security and exact grants.

The value for patients: one quick, consistent way in that records consent properly and does not leak who has an account. The value for the team: a security base the booking, consultation and records work can build on.

## Analysis

Seven independent reviewers (design, codebase details, scope, comprehension, implementation readiness, structure, inventive) examined the concept against the Product Context, SUPABASE.md, TESTING.md and the code. Their combined findings:

**1. The concept contradicts the source documents in five places.**

- Product Context §24 and SUPABASE.md §12 say patients use phone OTP. The concept makes Google the default and only launch method, and adds email.
- §24 names Resend or SES for email. The concept uses Brevo.
- §24 names Upstash for rate limiting.
- Decision D4 requires every outside data processor to be listed and India-hosted. Google, Brevo, MSG91 and Turnstile are not listed.
- None of the decisions D0–D20 covers the identity rules.

The design document must therefore carry a proposed decision D21 for the project lead to apply. It cannot be approved before that.

A separate product risk: Google blocks sign-in inside in-app browsers (WhatsApp, Instagram, Facebook). A Google-only launch locks out many tier-2 and tier-3 users who open links from those apps.

**2. Several Supabase behaviours break the concept as written.**

- **Accounts are created when a code is sent, not when it is verified.** An "on new user" trigger would create a profile and a patient role for every mistyped or abused number. "Email verified before account creation" cannot hold, and "new account" cannot be detected from creation. The profile and role must be created only when the email or phone becomes confirmed (OAuth users arrive confirmed). Or unconfirmed rows need a cleanup job.
- **Anyone can call Supabase's code endpoints directly with the public key.** That skips our server actions, rate limits, captcha and consent cookie. Abuse controls must sit inside Supabase itself:
  - its captcha, required whenever phone is on;
  - its own rate limits;
  - a Send-SMS hook that only allows +91 numbers and checks a database limiter (needed anyway, because MSG91 is not built in);
  - the phone and email providers switched off in the hosted project when `AUTH_METHODS` leaves them off.
- **Supabase's per-IP limits may count Vercel's server IP for all users.** Session refreshes alone could exceed the limits at a few thousand users, with mass errors and logouts. This must be checked, and refreshes kept to requests that actually carry a session cookie.
- **Session cookies are not httpOnly or secure by default** in our version of `@supabase/ssr`. Our server and middleware helpers must set this explicitly, and auth calls then happen on the server only.
- **Supabase reports a wrong code and an expired code the same way,** and has no per-code attempt counter. Either show one "invalid or expired" message, or track it in the app. "Too many attempts" needs an app-side counter.
- **Code settings need changing:**
  - email templates must send only the code, never a link;
  - expiry should be about 10 minutes, not 1 hour;
  - the resend interval should match the 30-second timer;
  - the local email quota of 2 per hour is too low for testing.
- **Manual identity linking is off** in `config.toml`. The callback must tell a "connect Google" flow from a sign-in, and handle "already linked", cancellation and unlinking.
- **Two sign-in flows can overwrite each other's PKCE verifier** unless the callback uses Supabase's flow id. Mixing localhost and 127.0.0.1 also loses the verifier, and the redirect allow-list in `config.toml` is wrong today (https on 127.0.0.1, no port 3100 for tests).
- **Adding a phone puts it in a pending field until it is verified.**
  - The "already in use" error codes are `phone_exists` and `email_exists`.
  - A race (user A has a pending number, user B confirms it first) must fail cleanly for A.
  - Automatic linking only works on confirmed emails. If a phone user's added email is still pending when they use Google with it, Supabase quietly creates a second account. Both orders must be tested.

**3. Consent: the core contradiction.** Consent is asked before the method, yet recorded only for new accounts. With no enumeration, the server cannot know in advance who is new. So every returning user ticks a box that is thrown away (including marketing). The cookie must also survive the code round trip and the Google redirect, and can be lost in in-app browsers. All reviewers converged on a **server-side consent gate**:

- "needs consent" means the user has no granted terms row for the current document version;
- it is checked at one point after every sign-in and on every protected request;
- until consent is given, the session reaches only the consent, name and sign-out steps.

The ticked box then becomes, at most, a hint that saves a step. A simpler option drops the cookie entirely: one "Finish sign-up" screen with the 18+/Terms box, the marketing box and the name field. That removes the signing secret, the forgery risk and the new-account detection.

Further consent findings:

- **Forgery.** "Users insert their own consent rows" lets anyone post a forged row with any version. Consent must be recorded only through a database function that takes no version or source from the caller.
- **Erasure.** An append-only table plus cascade-delete blocks account erasure. The design must choose how consent rows survive deletion.
- **Placeholder documents.** Rows recorded against placeholder legal versions can never be corrected, so production sign-up must stay off until HCQ supplies real Terms and Privacy versions.

**4. One user table is shared by the patient, partner and admin apps.** Two consequences:

- A blanket "new user gets the patient role" trigger gives staff accounts a patient role.
- Automatic linking lets a Google sign-in on the patient site, with a doctor's or admin's email, land in that staff account without its MFA.

Who gets the patient role, and whether staff may use the patient site, must be decided. Staff-role checks must require MFA level. A failing sign-up trigger blocks sign-up in all three apps, so it must be minimal, must never throw, and needs a fix-forward plan.

**5. Data model details.**

- **Role list.** The nine-role list will grow (G6, G18), and enum values cannot be removed, so the role model needs a deliberate choice.
- **`profiles` email and phone columns** will drift from the real values after changes. Drop them, or copy only confirmed values with a trigger.
- **Profile updates.** Allowed only on name, language and avatar, with checks.
- **Audit log.** SUPABASE.md puts it in the foundation migration; include it or state why not.
- **Auto-grant is on locally.** Contrary to the brief, `auto_expose_new_tables` is commented out in `config.toml`, so it defaults to on. It must be turned off or grants revoked.
- **Rate limiting.** In-memory limiting does not work on Vercel. A database limiter stores hashed keys only.

**6. Repo and Next.js 16 integration.**

- **CI.** Wiring session refresh into the proxy breaks every end-to-end test, because the Supabase environment variables are missing there. CI needs a local Supabase stack or a "no Supabase" mode.
- **Callback route.** `/auth/callback` would get a locale prefix from next-intl unless placed or excluded on purpose.
- **Static pages.** A header that reads cookies makes every public page dynamic. The user menu must be an isolated dynamic part so Home stays static.
- **Login URL form.** `/login?next=` already exists (footer links, doctor cards). One form should be kept and reused.
- **Stub pages.** The stubs for login, appointments and account must be removed and replaced by guarded pages.
- **zod placement.** apps/web has no zod, so schemas belong in packages/core.
- **UI primitives.** Sheet, checkbox and code input must be built on the existing radix-ui, or a new dependency approved.
- **Environment variables.** New ones must be added to `turbo.json`, or builds won't see them.
- **Local-only commands.** The checkout is linked to a remote Supabase project, so every database command must be explicitly local.

**7. Observability.** There is none today. Auth is the first feature where one failure blocks every sign-up. It needs:

- a server logger that strips codes, phones, emails, tokens and return paths;
- error-report scrubbing;
- outcome counts per method;
- an SMS volume and cost alert, which is the practical SMS-pumping detector;
- a short runbook.

**8. Gaps.**

- Name step rules, and when it shows (whenever the name is empty).
- +91-only phone input, the strongest pumping defence.
- `AUTH_METHODS` checked on the server.
- Masking formats.
- Missing states: SMS not delivered, offline, two tabs, cancelled at Google, missing verifier, captcha failure.
- Sign-out scope.
- Constant-time responses on send.
- Next steps for "already in use".
- Reword "phone is never merged" to "phone sign-in never links automatically".
- Recycled Indian phone numbers: a new SIM owner could enter an old patient's account. Add a step-up check, or record it as an accepted risk.

**Ideal Final Result.** Supabase owns codes, sessions, linking, captcha and endpoint abuse limits, so how a request arrives doesn't matter. The app owns only:

- method configuration checked on the server;
- one return-path sanitiser;
- one consent-and-name gate enforced by the database against real document versions;
- display.

Public pages stay static. No table holds an unverified contact. New methods plug into the same gate.

**Claims still to verify on a local stack:**

- that users are created at send time;
- per-IP behaviour for server-side calls;
- automatic linking with an unconfirmed email user;
- captcha on verify;
- which email template new and existing users receive.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - Identity schema (foundation and identity migrations), row-level security and exact grants in the same migration, pgTAP allow and deny tests, the RLS matrix document, consents added to the append-only rules.
  - Session refresh in the proxy, with httpOnly and secure cookies, only for requests that carry a session, and failing open when Supabase is down.
  - Google sign-in through a correctly routed `/auth/callback` that is aware of the flow id.
  - A server-side consent and name gate, recorded through a database function, with document versions held in the database.
  - A tested `next` sanitiser in packages/core, and one login URL form.
  - A guarded `(patient)` area with `/appointments` and `/account` placeholders.
  - A signed-in user menu that keeps public pages static, and POST sign-out.
  - `AUTH_METHODS` parsed in packages/core and enforced on the server.
  - Email and phone codes working locally (test numbers, mail catcher), with Supabase-level abuse controls designed and in place before either is switched on remotely.
  - Closed error contracts and a Supabase error-code mapping.
  - A redacting logger and outcome events.
  - A local Supabase stack in CI so the full Definition of Done can pass.
  - Profile: add phone, add email, connect Google (owner decision: in this task).
- **Out-of-Scope Non-Goals:**
  - Staff, partner and admin sign-in.
  - Account merging (self-serve or support) and account switching.
  - Family or guardian accounts.
  - Account deletion, data export and the correction workflow.
  - Real legal text. Production sign-up stays off until it exists.
  - Real Profile and Appointments content.
  - Native app sign-in, passkeys and passwords.
  - Changing an existing email.
  - Unlinking identities.
  - Re-consent on a version change, unless the owner chooses it.
  - In-memory rate limiting.
  - Captcha checked in both Supabase and the app.

## Alternatives Weighed

- **Consent capture.**
  - Signed cookie plus a server gate: fewer clicks, but a secret and a cookie lifecycle to manage.
  - Gate only, with one "Finish sign-up" screen: no cookie, no forgery surface; one extra screen.
  - A Supabase before-user-created hook: rejected by reviewers as the main mechanism, because it cannot see Google sign-ups.
- **Consent insert path.** A user insert under RLS: rejected, forgeable. The service role: rejected, SUPABASE.md §8 rule 9 forbids it for a user's own request. A parameterless database function: preferred.
- **Profile creation.**
  - On user insert: rejected as written, creates junk rows at code-send time.
  - On confirmation.
  - Lazily at the first authenticated gate.
- **Patient role grant.** In the trigger for everyone: staff get the patient role. From the web "Finish sign-up" step. From server-set app metadata.
- **Role model.** A nine-value enum. A minimal enum grown as needed. A roles lookup table (matches SUPABASE.md §7).
- **Rate limiting.**
  - In-memory: rejected, doesn't work on Vercel.
  - Supabase built-ins, captcha and an SMS hook calling a database limiter.
  - A Postgres limiter for app-side limits.
  - Upstash: a new dependency, needs approval.
- **Captcha.** Supabase-level: enforced at the endpoint, but applies to all three apps. App-level: bypassable through the public key.
- **Entry points.** Drawer, bottom sheet, `/login` and `?login=1`. `/login` only. A Next.js intercepting route over `/login`.
- **Launch methods.** Google-only: cheapest, but blocks in-app browsers. Google plus phone: matches §24, waits for DLT. All three behind config: owner's choice.
- **Wrong versus expired code.** One message, or tracking send time in the app.
- **Profile email and phone.** Drop them and read from auth, or a sync trigger for confirmed values.
- **"In use" on add flows.**
  - Reveal after proving control: rejected by the owner, because it needs a separate verification and SMS service.
  - The accepted limitation with rate limits: chosen.
- **Testing Google.** Mocked code exchange plus a redirect check; a local Keycloak provider; a scripted manual check on staging.
- **User check in the proxy.** `getUser()` on every navigation, or `getClaims()` in the proxy and `getUser()` in actions and pages.
- **Email vendor.** Brevo (owner's choice, needs a D4 review) or Resend/SES (§24).
- **Owner decisions taken during clarification:**
  - Separate accounts for phone versus Google/email are acceptable in v1.
  - Our own verification service for add-phone/add-email: rejected by the owner; Supabase's "in use" check is accepted.
  - Deferring the Profile contact features: rejected by the owner; built in this task.

## Key Decisions & Staging for Next Steps

**Owner decisions after the Goldfish review (2026-11-23):**

- **Methods and order.** Phone OTP stays primary and the UI default, as in §24. Email OTP (Brevo) is configured now as the interim method while DLT is pending; Google is extra. Deployed environments use `email,google` until DLT is approved, local uses all three, and phone is listed first whenever enabled.
- **D21 is an addition, not a replacement.** The design document carries a proposed D21 adding email (Brevo) and Google as further patient methods, the D4 processor entries (Google, Brevo, MSG91, Cloudflare Turnstile) and the identity rules. The project lead applies it. The email vendor (Brevo instead of the Resend/SES named in §24) and the rate-limit store are part of D21.
- **Consent: gate only (alternative A1-b).** One Finish sign-up screen after authentication collects the 18+/Terms box, the optional marketing box and the name, for anyone without consent for the current Terms version. It is recorded by a parameterless database function, and the session can reach nothing else until consent is given. There is no pre-auth checkbox, no consent cookie and no signing secret.
- **In-app browsers.** Google blocks in-app browsers. This is a risk only for a Google-only period; since email (and later phone) are available, there is no blocker for development.

Remaining blocking items for the design document (owner choices made above are no longer open):

Blocking (must be settled before the design document can be approved):

1. **Proposed D21.** Patient methods and launch order, email vendor, rate-limit store, D4 processor entries, and the matching SUPABASE.md §12 change. Applied by the project lead.
2. _(Settled: phone primary, email interim, Google extra.)_
3. **Consent design.** _(Settled: gate only.)_ Still to define: what declining or closing the Finish sign-up screen does.
4. **Consent recording.** Only through a parameterless database function, with versions in the database, and client write rights revoked.
5. **Consent retention when an account is erased.**
6. **Placeholder legal versions.** Production sign-up stays off while they are placeholders.
7. **When the profile and role are created.** On confirmation, or lazily. Plus cleanup of unconfirmed users and stale pending contacts.
8. **Abuse controls inside Supabase.** Captcha, an SMS hook allowing only +91 with a limiter, and unused providers switched off remotely.
9. **Client IP for server-side Supabase calls,** and the refresh strategy.
10. **Explicit cookie options and session lifetime.**
11. **Code error behaviour.** Wrong versus expired, the attempt counter, one error list.
12. **Patient role versus the shared user table.** Staff on the patient site; MFA level in staff checks.
13. **Trigger safety and its fix-forward plan.**
14. **CI with a local Supabase stack,** and the Google test approach.
15. **Document structure.** One spec with separately approved parts, or three specs: database foundation; auth core; Profile contacts and linking.

Important (must be in the document):

- the `config.toml` auth settings;
- the migration plan (including the audit log) and the role model;
- profile columns and grants;
- the Profile flow ordering, races and linking tests;
- routing, the callback location and static pages;
- the `next` sanitiser test corpus;
- PKCE flow id;
- the `AUTH_METHODS` contract and environment variables;
- observability;
- the threat table with residual risks and an acceptor;
- new dependencies (approval needed);
- marketing consent for returning users and withdrawal;
- normalisation and name rules;
- the recycled-number risk;
- remote rollout order, with every database command marked local.

Minor: masking formats, panel mechanics, extra states, sign-out scope, analytics fields, avatar hotlinking, and the `[slug]` path drift in CLAUDE.md.
