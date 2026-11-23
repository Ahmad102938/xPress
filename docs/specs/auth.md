# Patient sign-in and sign-up (apps/web)

*   **Author:** Ahmad102938
*   **Status:** Built (Milestones 1-7, 2026-11-23); drift check pending
*   **Date:** 2026-11-23

--------------------------------------------------------------------------------

## Overview

Patients need an account to book doctors, consult online and see their appointments. This design adds sign-in and sign-up to the patient site (`apps/web`) and the minimal database slice that holds identity, roles and consent.

There is one shared sign-in panel. It opens as a side drawer on desktop and a bottom sheet on mobile, and the same component renders on a `/login` page.

Methods:
- **Phone one-time code**: the primary method (Product Context §24). It is the default in the UI and comes first whenever it is enabled.
- **Email one-time code**, sent through Brevo, the interim method while DLT registration for SMS (MSG91) is pending.
- **Google**, as an additional method.

The `AUTH_METHODS` setting decides which methods each environment shows. After any method, a user with no recorded consent for the current Terms version sees a **Finish sign-up** screen: the 18+ and Terms box, an optional marketing box, and their name. Consent is saved in the database through a function the user cannot tamper with.

Signed-in users get a header menu, two protected placeholder pages (`/appointments`, `/account`), and Profile actions to add a phone, add an email, or connect Google.

The project is in development; nothing here goes to production until real Terms and Privacy versions exist. This design proposes a new Product Context decision (D21) that the project lead applies.

## The Problem

The site has no accounts today. Every "Book", "My appointments" and account link leads to a placeholder, so no other patient feature can be built until identity exists.

Building it correctly is harder than adding a login form, for five reasons.

1. **Sign-in can leak whether a person is registered.** A screen that says "no account for this number" tells anyone who types a number whether that person uses a healthcare service. Hard rule 3 and §14 treat that as health-related personal data.
2. **Consent must be real and provable.** India's DPDP Act requires consent to be free, specific and recorded against the exact document version. A consent row that the browser can write, or that is recorded against a placeholder Terms version, is not evidence.
3. **One-time codes are an abuse target.**
   - Supabase creates a user record as soon as a code is *sent*, so mistyped and spam numbers become user records.
   - Anyone can call Supabase's code endpoints directly with the public key, skipping our own checks.
   - SMS in India is paid per message (and needs DLT templates), so "SMS pumping" turns directly into cost.
4. **One person may have several ways in.** Google and email can share an address; a phone number cannot be matched to an email. Without clear rules a patient ends up with split accounts, or worse, signs into someone else's.
5. **The database serves three apps.** The patient, partner and admin apps share one `auth.users` table and one Supabase project. A careless sign-up trigger would give staff a patient role, and a failing trigger would block sign-up in all three apps.

The proposed solution:
- keep Supabase Auth as the single owner of codes, sessions and identity linking;
- add one server-side consent and name gate that every method passes through;
- create profiles and roles only for confirmed identities;
- put abuse limits where they cannot be bypassed;
- never reveal account existence on the sign-in screens.

## Goals

*   **G1. Sign-in with three methods, controlled by configuration.**
    *   Phone code, email code and Google all work end to end on the local stack.
    *   `AUTH_METHODS` (comma list of `phone`, `email`, `google`) controls which appear, and the server rejects disabled methods.
    *   Phone is shown first whenever enabled.
    *   Local default is `phone,email,google`; deployed environments start with `email,google` until DLT is approved.
*   **G2. One panel, three entry points.** The same panel opens as a desktop drawer (about 420px, right side), a mobile bottom sheet (about 90% height), and on `/login` (noindex). It opens from:
    *   the header button;
    *   any signed-out action that needs login, with a return path;
    *   a protected route, which redirects to the login URL with `next`.

    After sign-in the user lands on the sanitised return path.
*   **G3. No account enumeration on sign-in screens.** Sending a code, verifying it and Google sign-in look and behave the same for new and existing users: same messages, same states, no timing difference worth exploiting.
*   **G4. A consent gate that cannot be skipped or forged.**
    *   Any signed-in user without a granted Terms/Privacy consent for the current version sees Finish sign-up before anything else.
    *   Consent is recorded only through a database function that takes no version or source from the caller.
    *   Rows are append-only.
    *   Marketing is optional and unticked.
*   **G5. Profiles and roles only for confirmed identities.** A profile and the patient role exist only once an email or phone is confirmed (Google arrives confirmed). Mistyped or abandoned destinations never create profile rows. Unconfirmed users are cleaned up.
*   **G6. Identity rules as decided by the owner.**
    *   Google and email resolve to one account on the same verified email.
    *   Phone sign-in never links automatically.
    *   Profile lets a user add a free phone or email after verifying it, and connect Google.
    *   A taken phone or email shows "already in use" and changes nothing.
*   **G7. Abuse limits that cannot be bypassed.** Limits sit inside Supabase as well as in the app:
    *   captcha when enabled;
    *   +91-only phone numbers;
    *   per-destination and per-IP send limits;
    *   attempt limits;
    *   resend cooldown;
    *   providers switched off remotely when not in `AUTH_METHODS`.
*   **G8. Safe sessions.** Session cookies are httpOnly, `secure` outside local development and `sameSite=lax`. There are no tokens in URLs or local storage. Server checks use `getUser()`. The session refreshes in `proxy.ts` without changing locale behaviour, and public pages such as Home stay static.
*   **G9. Database slice with exact permissions.**
    *   `app_role`, `profiles`, `user_roles`, `consents` and helpers.
    *   Row-level security switched on in the same migration that creates each table.
    *   Grants written out explicitly for `anon`, `authenticated` and `service_role`.
    *   pgTAP allow and deny tests.
    *   Types regenerated into `packages/db`.
*   **G10. Signed-in experience.**
    *   A header user menu (My appointments, Profile, Logout).
    *   Logout as a POST server action.
    *   The mobile "Account" tab opens the panel when signed out.
    *   `/appointments` and `/account` are guarded placeholders.
*   **G11. Nothing sensitive in logs.** No codes, phone numbers, emails, tokens or return paths in logs, error reports or analytics. Outcomes are counted without identifiers.
*   **G12. Fully tested.**
    *   Unit, component, server-action, pgTAP, and Playwright tests against the local Supabase stack (mail catcher, test phone numbers), in English and Hindi, with an axe scan of the open panel at 360px and 1280px.
    *   The nine identity tests requested by the owner.
    *   CI can run them.

## Non-Goals

*   Partner, doctor and admin sign-in (email plus TOTP MFA for staff), and links to those apps from the patient site.
*   Merging accounts, self-serve or by support, and switching between accounts. A person with a phone account and a separate Google/email account has two accounts in v1.
*   Revealing "already in use" only after proof of control on Profile add-phone/add-email. Supabase checks ownership first, and the owner accepted this, with rate limits as mitigation.
*   Family or guardian accounts, and booking for someone else.
*   Changing an existing email or phone, and unlinking an identity.
*   Account deletion, data export and correction workflows (§14), beyond designing the consent table so erasure stays possible later.
*   Real Terms and Privacy text. The versions stay `TODO_HCQ` placeholders, and production sign-up stays off until HCQ supplies them.
*   Real Profile and Appointments content, booking, and requiring a verified phone before a first booking (a later task).
*   Passwords, passkeys, WhatsApp codes and native-app sign-in. The method interface leaves room for them.
*   Applying settings to the remote (staging or production) Supabase project. This design lists them; the project lead applies them.

## Open Questions

All design questions Q1 to Q13 were decided by the author on 2026-11-23 (see "Decisions" in the Technical Plan). What remains are facts to check on the local Supabase stack before the build relies on them. Docker was not running while drafting.

*   **OQ1: Per-IP counting for server calls.** Does hosted Supabase count every server-side call against Vercel's IP, and can the real client IP be forwarded safely? Checked before staging; the Q5 design limits the impact either way.
*   **OQ2: Pending contact changes.** Can an abandoned pending phone or email change be cleared through the Supabase Admin API without writing to `auth.*` directly? If not, the design relies on code expiry plus the test that an expired pending value can never be confirmed (CUJ 9, T8).
*   **OQ3: Linking with an unconfirmed email user.** When an unconfirmed email user exists (code sent, never verified) and someone signs in with Google using that email, does Supabase link, replace or create a second user? The answer decides whether the cleanup job must run before linking tests are meaningful.
*   **OQ4: Captcha on verify.** Does Supabase's built-in captcha also apply to the verify call, or only to the send call?
*   **OQ5: Email templates.** Which email template do new and existing email-code users receive (confirmation vs magic link)? Both must contain only the code.
*   **OQ6: User created at send time.** Confirm on a running stack that `signInWithOtp` with `shouldCreateUser: true` creates an unconfirmed `auth.users` row at send time. The installed auth-js 2.119.2 sends `create_user: true` by default.

## Critical User Journeys (CUJs)

### CUJ 1: New patient signs up with a phone code

*   **Given**: Phone is enabled, the number is new, and the user is signed out on Home.
*   **When**:
    1.  They tap "Login / Sign up" and enter a 10-digit number.
    2.  They complete the captcha (when configured) and tap Continue.
    3.  They enter the 6-digit code.
*   **Then**:
    *   A session is created and the panel moves to Finish sign-up.
    *   They tick the 18+/Terms box, optionally tick marketing, enter their name and submit.
    *   The profile, patient role and consent rows are created in one transaction, and the panel closes on the page they started from.

### CUJ 2: Returning patient signs in

*   **Given**: The user already completed Finish sign-up for the current Terms version.
*   **When**: They sign in with any of their methods.
*   **Then**: The panel closes straight after the code or Google step, with no Finish sign-up screen. The sign-in screens looked identical to CUJ 1 until then.

### CUJ 3: Email and Google resolve to one account

*   **Given**: A user signed up with an email code for `x@example.test`.
*   **When**: They later choose "Continue with Google" with the same verified Google email.
*   **Then**:
    *   Supabase links Google to the same account. They land signed in, with the same profile and no Finish sign-up (consent already present).
    *   The reverse order (Google first, then email code) also gives one account.

### CUJ 4: Signed-out action needs login

*   **Given**: A signed-out user on a doctor card or the footer.
*   **When**: They tap "Book" or "My appointments", or open `/appointments` directly.
*   **Then**:
    *   With JavaScript, the panel opens with the return path. Without JavaScript, the link goes to `/login?next=...`.
    *   A direct visit to a protected page redirects to `/login?next=<sanitised path>`.
    *   After sign-in (and Finish sign-up if needed) they land on the sanitised path.
    *   `next=//evil.example` and similar values always fall back to `/`.

### CUJ 5: User stops at Finish sign-up

*   **Given**: The user verified a code but closed the panel at Finish sign-up.
*   **When**: They browse public pages, then open `/account` or try to book.
*   **Then**:
    *   Public pages work, and the header shows "Finish sign-up".
    *   Protected pages and actions open the Finish sign-up screen until it is completed.

### CUJ 6: Add a phone to a Google/email account

*   **Given**: A signed-in user with no phone.
*   **When**: In Profile they enter a phone number.
*   **Then**:
    *   If the number is free, they get a code. After it is verified, the phone is on their account and shown in Profile.
    *   If the number belongs to another account, they see "This number is already in use." straight away. Nothing changes on either account.
    *   Repeated attempts hit the per-user and per-IP limits.

### CUJ 7: Phone account adds an email

*   **Given**: A phone-only user.
*   **When**: In Profile they add an email.
*   **Then**:
    *   If free, a code is sent. After verification the email is on the account, and the screen says the email can now also be used to sign in.
    *   If taken, they see "This email is already in use. Log in with it, or use a different email." Nothing is merged.

### CUJ 8: Connect Google from Profile

*   **Given**: A signed-in user without a Google identity.
*   **When**: They choose "Connect Google".
*   **Then**:
    *   After Google consent they return to Profile with Google listed.
    *   If that Google identity already belongs to another account, they see a "This Google account is already in use" message and nothing changes.
    *   Cancelling at Google returns them to Profile with no change.

### CUJ 9: Abandoned or raced phone change

*   **Given**: User A requested a code for phone P but never verified it.
*   **When**: User B verifies P on their own account first, or A's code expires.
*   **Then**: A's later verify fails with the generic message. P is never attached to A, and A's account is unchanged.

### CUJ 10: Phone sign-in after long inactivity

*   **Given**: An account whose last sign-in was more than 90 days ago.
*   **When**: Someone signs in to it with a phone code.
*   **Then**:
    *   If the account also has an email or Google identity, the session stays in a "confirm it's you" state until the person also verifies a code sent to that email, or signs in with that Google account.
    *   If the account is phone-only, they see "Is this your account?":
        *   **"Yes"** continues, and the choice is recorded in the audit log.
        *   **"No, this is a new number"** signs them out and points to Contact us.

### CUJ 11: Sign out

*   **Given**: A signed-in user.
*   **When**: They choose Logout in the user menu or Profile.
*   **Then**: A POST server action ends the session on this device, clears the session cookies, and returns them to Home.

## Technical Plan (Architecture)

### Decisions (author, 2026-11-23)

| # | Decision |
|---|---|
| Methods | **Phone primary** (UI default, listed first when enabled). **Email** through Brevo, interim while DLT is pending. **Google** extra. `AUTH_METHODS`: local `phone,email,google`; deployed `email,google` until DLT is approved. |
| Identity | Google and email are one identity on a verified email (Supabase automatic linking). Phone sign-in never links automatically. Profile add-phone, add-email and connect-Google are in this task. "Already in use" is shown before any code (Supabase checks ownership first; accepted), with rate limits. No merging. |
| Consent | Gate only. A Finish sign-up screen after authentication asks for the required 18+/Terms box, the optional marketing box and the name, for anyone without a granted Terms consent for the current version. There is no checkbox before sign-in and no consent cookie. |
| Q1 | Declining or closing Finish sign-up keeps the user **signed in but blocked**: public pages work, and protected pages and actions return to the gate. |
| Q2 | Profile, patient role and consent are created **together at Finish sign-up** by one own-user database function. There is no trigger on `auth.users` for creation. Unconfirmed users are cleaned up after 24 hours. |
| Q3 | Staff may use the patient site and get the patient role too. **Every staff-role check requires `aal2`** (MFA), which patient-site sessions never have. |
| Q4a | **Supabase built-in captcha (Turnstile)**, read from env and off when unset. It is project-wide, so partner and admin flows must include the widget later. |
| Q4b | App-side limits in a **Postgres limiter** (hashed keys, one definer function, pg_cron cleanup), shared with the SMS hook. |
| Q5 | `proxy.ts` acts only when an `sb-*` cookie exists and uses **`getClaims()`**. **`getUser()`** is used in server actions, protected pages, the gate and `/auth/callback`. Asymmetric JWT signing keys are used. |
| Q6 | One message for a wrong or expired code. Five failed verifies per destination force a new code. |
| Q7 | `app_role` **enum with all nine roles**. This differs from the `roles` table planned in SUPABASE.md §7; roles can only be added. |
| Q8 | `profiles.email` and `profiles.phone` are **kept and shown**, synced by a minimal never-raise definer trigger `after update of email, phone on auth.users` (confirmed values only). This is the single exception to "nothing on `auth.users`". |
| Q9 | `consents.user_id` is **`on delete set null`**. The append-only guard allows only that change. |
| Q10 | **Fail-safe app plus a CI stack.** A missing Supabase env never crashes public pages. The production build fails without it. Existing e2e runs unchanged. A new auth e2e project and the database job run on a local Supabase stack. |
| Q11 | One file, `docs/specs/auth.md`, in three parts: Part A database foundation; Part B sign-in core; Part C Profile contacts and linking. |
| Q12 | The gate checks the **current** Terms version, so a new version re-asks everyone. Marketing is offered at Finish sign-up and changed later in Profile, each change a new row. Withdrawing Terms means deleting the account (out of scope). |
| Q13 | **Step-up after 90 days of inactivity** on phone sign-in: a second factor when the account has email or Google; a "Is this your account?" choice for phone-only accounts. Tracked with our own `profiles.last_seen_at`. |

### Data flow

```text
Browser (apps/web)                      Next.js server (Vercel)                     Supabase (one project, local or hosted)
------------------                      -----------------------                     ---------------------------------------
Login panel (drawer / sheet / /login)
  PhoneStep / EmailStep --(server action: sendPhoneOtp / sendEmailOtp)-->
                                        zod validate, AUTH_METHODS check,
                                        rate_limit_hit(ip), rate_limit_hit(dest) --> Postgres limiter (definer fn)
                                        supabase.auth.signInWithOtp(captchaToken) --> GoTrue: captcha check, own limits,
                                                                                     creates unconfirmed user, sends code
                                                                                     (email: SMTP/Mailpit; SMS: hook -> MSG91,
                                                                                      +91 only, limiter)
  OtpStep --------------(server action: verifyOtp)-------------------------------> GoTrue verify -> session
                                        sets httpOnly session cookies
                                        authState() via getUser() + my_auth_state() -> needs_finish | step_up | done
  FinishSignupStep -----(server action: finishSignup)----------------------------> finish_signup() definer fn:
                                                                                     profile + patient role + consents
                                                                                     + audit_log (one transaction)
  GoogleButton ---------(server action: startGoogle)--> signInWithOAuth(PKCE) --> Google --> GoTrue
                                        /auth/callback?code&flow  <---------------- redirect with code
                                        exchangeCodeForSession, authState(), redirect to sanitised next
Header user menu (client island) --GET /auth/session (no-store)--> getUser() + my_auth_state() -> {state, name, avatar}
proxy.ts on every request: if sb-* cookie -> getClaims() (refresh near expiry); next-intl unchanged
```

### Part A: Database foundation and identity slice

Two new migrations, local only, created with `pnpm supabase migration new`:
- `<ts>_foundation.sql`
- `<ts>_identity.sql`

The rules for both:
- Every table switches on row-level security in the same migration that creates it.
- Grants are written out explicitly. `config.toml` sets `auto_expose_new_tables = false`, and each migration also revokes the default grants, so behaviour does not depend on the setting.
- Every security-definer function sets `search_path = ''`, uses fully qualified names, checks the caller, and is `revoke execute ... from public, anon` before granting only to the roles that need it.

**Foundation migration**
*   `app_role` enum with patient, clinic_admin, clinic_staff, doctor, pharmacy_staff, shop_partner, delivery_partner, support and admin.
*   `consent_type` enum (`terms_privacy`, `marketing`) and `auth_source` enum (`phone`, `email`, `google`).
*   `public.set_updated_at()` trigger function.
*   `public.has_role(app_role) returns boolean`:
    *   stable, security definer, no user-id argument (it checks `auth.uid()` only);
    *   returns true when `user_roles` has the role;
    *   for any role other than `patient`, it also requires the session's `aal` claim to be `aal2` (Q3).
*   `public.audit_log`, append-only, as SUPABASE.md §7 places it in foundation:
    *   columns: id, actor_id (nullable, `on delete set null`), action text, subject_type text, subject_id uuid, metadata jsonb (no personal data), created_at;
    *   no client grants; written only by definer functions;
    *   UPDATE and DELETE revoked from anon, authenticated and service_role, plus a guard trigger.
*   `public.rate_limits` (key_hash text, window_start timestamptz, hits int, primary key (key_hash, window_start)):
    *   row-level security on, no policies, no client grants;
    *   `public.rate_limit_hit(p_key_hash text, p_window_seconds int, p_max int) returns boolean` checks and counts atomically;
    *   execute granted only to `service_role` (the server's limiter client) and `supabase_auth_admin` (the SMS hook);
    *   keys are HMAC-SHA256 of `ip:<addr>`, `dest:<normalised>` or `user:<uuid>`, computed on the server with `RATE_LIMIT_HMAC_SECRET`;
    *   a pg_cron job deletes windows older than 1 day.
*   `public.legal_versions` (consent_type primary key, version text):
    *   seeded with `terms_privacy = 'draft-2026-11'` and `marketing = 'draft-2026-11'`, both `TODO_HCQ`;
    *   readable by authenticated, writable by nobody (migrations only);
    *   a test checks it matches the packages/core constants.

**Identity migration**
*   `public.profiles`:
    *   columns: id (primary key, references auth.users on delete cascade), full_name text (check length 2 to 80 after trim), email text, phone text, preferred_language text (default 'en', check in ('en','hi')), avatar_url text, last_seen_at timestamptz, created_at, updated_at (trigger);
    *   grants: authenticated `select` and `update (full_name, preferred_language)` only, nothing for anon;
    *   policies: select and update where `id = auth.uid()`.
*   `public.user_roles` (user_id references auth.users on delete cascade, role app_role, created_at, primary key (user_id, role)):
    *   grant select to authenticated; policy: own rows;
    *   no insert, update or delete for anon or authenticated;
    *   written only by `finish_signup()` and future admin functions.
*   `public.consents` (id, user_id references auth.users **on delete set null**, consent_type, document_version, granted boolean, source auth_source, created_at):
    *   grant select to authenticated; policy: own rows;
    *   no insert, update or delete for any client role;
    *   guard trigger `consents_append_only` rejects all UPDATE and DELETE, except an update where only `user_id` changes from a value to null (Q9);
    *   UPDATE and DELETE are also revoked from anon, authenticated and service_role.
*   `public.my_auth_state() returns json`, security definer, own user only. It returns `has_profile`, `has_current_terms` (a granted terms row for the current `legal_versions` version), `full_name` and `last_seen_at`, and nothing else.
*   `public.finish_signup(p_full_name text, p_marketing boolean)`, security definer, own user only. In one transaction it:
    1.  requires a confirmed identity (`email_confirmed_at` or `phone_confirmed_at` set);
    2.  upserts the profile (name; confirmed email and phone copied from `auth.users`; avatar and name from Google metadata only as initial values);
    3.  inserts the `patient` role (on conflict do nothing);
    4.  inserts a granted `terms_privacy` consent at the current version;
    5.  inserts a `marketing` consent with `granted = p_marketing`;
    6.  takes `source` from the session's `app_metadata.provider` (phone, email or google), never from a parameter;
    7.  writes `audit_log` rows `role.granted` and `consent.recorded` (no personal data).
*   `public.record_consent(p_type consent_type, p_granted boolean)`, own user only, the current version from `legal_versions`. Used by the Profile marketing toggle.
*   `public.touch_last_seen()`, own user only. It updates `last_seen_at` when the stored value is older than 1 day and returns the previous value, for the Q13 check.
*   `public.sync_contacts_from_auth()`, a trigger function on `auth.users` (`after update of email, phone`, Q8):
    *   security definer, `search_path = ''`;
    *   copies only confirmed `email` and `phone` into the matching profile when one exists;
    *   wraps its body in an exception handler so it never raises.
*   `public.unconfirmed_users_older_than(interval)`, execute granted to service_role only. Read-only; returns ids of users with no confirmed email or phone and `created_at` older than the interval, for the cleanup job.

**Tests (pgTAP, `supabase/tests/`):**
*   RLS allow and deny tests for every table.
*   Exact grants per role (anon has nothing).
*   `has_role` with aal1 and aal2.
*   `finish_signup` behaviour:
    *   requires confirmation;
    *   is idempotent;
    *   takes source from the claim;
    *   cannot run for another user.
*   Append-only guards on consents and audit_log, including the Q9 exception and nothing more.
*   The sync trigger never raises and never copies pending values.
*   The rate limiter counts and expires.
*   `legal_versions` matches the constants (also checked on the TypeScript side).
*   `docs/rls-matrix.md` is created with the role-by-table matrix.

### Part B: Sign-in core

**Supabase configuration (`supabase/config.toml`, local only, no secrets).** The final key names are checked against the CLI 3.2 schema during the build.
*   **Site and redirects:**
    *   `site_url = "http://localhost:3000"`;
    *   additional redirect URLs for `http://localhost:3000`, `3001`, `3002` and `3100` (Playwright), plus `http://partners.localhost:3001` and `http://admin.localhost:3002`.
    *   One host (`localhost`) everywhere, so the PKCE verifier cookie survives. This fixes today's `https://127.0.0.1:3000`.
*   **Email:**
    *   OTP length 6, expiry 600 s, `max_frequency` 30 s;
    *   templates show only `{{ .Token }}` (confirmation, magic link, email change);
    *   the local email quota is raised for tests;
    *   Mailpit/Inbucket receives the mail.
*   **SMS:** enabled with a dummy provider and test OTPs. `+919000000001` to `+919000000005` all use code `123456`, marked as local-only test values.
*   **Linking and changes:**
    *   `enable_manual_linking = true`;
    *   automatic linking stays on (Supabase default);
    *   `double_confirm_changes` is left as is (email changes are out of scope).
*   **Google:** `[auth.external.google]` enabled with `client_id` and `secret` from `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` and `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)` in git-ignored `supabase/.env`. Disabled when unset. Local redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
*   **Captcha:** `[auth.captcha]` with Turnstile, secret from env, off when unset.
*   **Grants:** `auto_expose_new_tables = false`.
*   **Signing keys:** asymmetric JWT signing keys for `getClaims()`.

**packages/core** (pure, unit-tested, zod already a dependency):
*   **Phone helpers.** `normalizeIndianPhone` accepts 10 digits starting 6 to 9, with an optional `+91`, `91` or `0` prefix and spaces or dashes, and returns `+91XXXXXXXXXX` or null. `maskPhone` gives `+91 98XXXXXX10`. `maskEmail` gives `t•••@example.test`.
*   **`sanitizeNextPath(input, locales)`.** Returns `/` unless the input is a same-site path that:
    *   starts with exactly one `/`;
    *   contains no `//`, no backslash, no scheme and no control characters, including after one decode;
    *   does not point to `/login` or `/auth/*` (so it can't loop).

    The `/hi` prefix is kept.
*   **Schemas.** `otpCodeSchema` (exactly 6 digits) and `fullNameSchema` (2 to 80 after trim, letters including Devanagari, spaces, `.`, `'`, `-`).
*   **`parseAuthMethods(value)`.** Comma list of phone, email, google. Unset means `["google"]` (your brief's default). Each environment sets its list explicitly (local `phone,email,google`; deployed `email,google` until DLT). Phone is always ordered first when present. Unknown values throw at build time.
*   **Constants.** `LEGAL_VERSIONS` (TODO_HCQ), `AUTH_ERROR` (a closed list of user-facing error keys), and `mapSupabaseAuthError(code)` mapping Supabase codes to those keys. The mapping never distinguishes existing from new users on the sign-in screens.
*   **`AuthMethod` interface** (`id`, `kind: "otp" | "oauth"`, the step component key and the server action names), so WhatsApp or passkeys can be added later as new entries.

**packages/db:**
*   **Cookie options.** Explicit `cookieOptions` in the server client and the proxy helper: httpOnly, `secure` when not local, sameSite lax, and a session lifetime set in config. The browser client is not used for auth.
*   **`updateSession(request, response)`.**
    *   Only runs when an `sb-*` cookie exists.
    *   Uses `getClaims()` and refreshes near expiry.
    *   Copies refreshed cookies onto next-intl redirect and rewrite responses.
    *   Fails safe (returns the response unchanged, one warning without identifiers) when the Supabase env is missing.
*   **Server-only clients.**
    *   `createAdminClient()` uses the service role and is limited to three uses: the rate limiter, the cleanup job and the `unconfirmed_users_older_than` read. It is never used to serve a user's own data (SUPABASE.md §8 rule 9).
    *   `createLimiterClient()` wraps `rate_limit_hit`.
*   **Types.** Generated `Database` types from `pnpm db:types` (made explicitly local).

**apps/web:**
*   **`src/proxy.ts`.** next-intl as today, then `updateSession`. The intl matcher excludes `/auth/*` so the callback is not locale-prefixed.
*   **`src/app/auth/callback/route.ts`.**
    *   Reads `code`, `error` and the flow id.
    *   Calls `exchangeCodeForSession` with the flow id, then `getUser()` and the auth state.
    *   Redirects to the sanitised `next`; with `?login=1&step=finish` when the gate is needed; to Profile for a link flow.
    *   On error or cancellation, redirects back with `?login=1&error=<key>` (or Profile with a message for link flows).
*   **`src/app/auth/session/route.ts`** (GET, no-store). Returns `{state: "signed_out" | "needs_finish" | "step_up" | "signed_in", name, avatarUrl, initials}` for the header island.
*   **`src/features/auth/`.**
    *   Components: AuthProvider (open state, return intent, step), LoginDrawer (radix Dialog styled as a right drawer at 420px from `md`, bottom sheet at 90% height below), LoginPanel (`variant: "drawer" | "page"`), StepHeader, PhoneStep, EmailStep, OtpStep (single input, `autocomplete="one-time-code"`, segmented look, paste, auto-submit, 30 s resend), GoogleButton (Google branding rules), FinishSignupStep, StepUpStep, TurnstileWidget (script loaded manually when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set), UserMenu.
    *   Method registry built from `AUTH_METHODS` on the server and passed as props, never read by the client.
*   **Server actions** (`src/features/auth/actions.ts`, zod-validated, all returning a closed result type):
    *   `sendPhoneOtp`, `sendEmailOtp`, `verifyOtp`, `startGoogle`, `finishSignup`, `confirmStepUp`, `signOut`;
    *   Profile: `addPhone`, `verifyAddPhone`, `addEmail`, `verifyAddEmail`, `connectGoogle`, `setMarketing`;
    *   every action re-checks `AUTH_METHODS` and its rate limits.
*   **Pages.**
    *   `/login`: page variant, noindex, redirects signed-in users to `next`.
    *   `(patient)/layout.tsx`: guard with `getUser()` and auth state, redirecting to `/login?next=` or the gate.
    *   `(patient)/appointments` and `(patient)/account`: placeholders; account shows name, email, phone, the Profile actions and the marketing toggle.
    *   The `login`, `appointments` and `account` stubs are removed from `stub-pages.ts`.
*   **Header.** The user menu is a client island fetching `/auth/session`, so Home and other public pages stay static. A test checks Home is still prerendered.
*   **Bottom nav and links.** The mobile "Account" tab opens the panel when signed out. `footerHref` stays the canonical `/login?next=` form. Clicks on such links open the panel instead when JavaScript is available, and `?login=1&next=` opens it on any page.
*   **i18n.** An `auth` namespace in en and hi, added to `CLIENT_NAMESPACES`. The parity and no-partner-or-admin copy tests apply.

**Gate logic** (one server function, `authState()`, used by the callback, `verifyOtp`, the `(patient)` layout, `/auth/session` and every profile-needing action). In order:
1.  No user: `signed_out`.
2.  No profile, or no current Terms consent: `needs_finish`.
3.  `last_seen_at` older than 90 days with this sign-in made by phone code, and not yet confirmed in this session: `step_up`. Recorded in an httpOnly, short-lived step-up cookie bound to the session id.
4.  Otherwise: `signed_in`, and `touch_last_seen()` is called.

**Abuse controls:**
*   **Inside Supabase.** Captcha; Supabase's own limits; the Send-SMS hook (when phone goes live) allowing only +91 and calling `rate_limit_hit`; unused providers disabled in the hosted project.
*   **In the app (defence in depth).**
    *   Code sends: per IP 10 per hour, per destination 5 per hour, with a 30 s resend cooldown.
    *   Verifies: 5 failed attempts per destination per code.
    *   Profile adds: per user 5 per day, per IP 20 per day.
    *   Responses for limited and unlimited requests are shaped identically.

**Cleanup job.** `src/app/api/cron/auth-cleanup/route.ts` is protected by `CRON_SECRET` (a Vercel cron, daily). It deletes users from `unconfirmed_users_older_than('24 hours')` through `auth.admin.deleteUser`, and removes old `rate_limits` rows if pg_cron is unavailable. Locally it can be run by hand. Covered by a test.

**Observability.**
*   `src/lib/log.ts`: a structured logger with an allow-list of fields that never includes code, phone, email, token, `next` or a user id in clear text.
*   Auth outcome events: `auth.otp_send`, `auth.otp_verify`, `auth.oauth_callback`, `auth.finish_signup`, `auth.link_identity`, `auth.contact_change` and `auth.step_up`, each with `{method, outcome, locale}` and a request id.
*   An SMS volume alert is listed for when the hook is live.
*   Sentry is not part of this task.

### Part C: Profile contacts and linking

*   **Add phone:**
    1.  `addPhone` normalises the number and checks limits.
    2.  It calls `updateUser({ phone })`. `phone_exists` returns "This number is already in use." with no change; otherwise Supabase sends the code to the pending `phone_change`.
    3.  `verifyAddPhone` calls `verifyOtp({ type: "phone_change" })`. On success, Supabase sets `phone`, the Q8 trigger copies it into `profiles`, and an audit row is written.
*   **Add email:** the same with `updateUser({ email })` and `type: "email_change"`. `email_exists` returns "This email is already in use. Log in with it, or use a different email." Success says the email can now also be used to sign in.
*   **Connect Google:**
    1.  `connectGoogle` calls `linkIdentity({ provider: "google", options: { redirectTo: <callback with flow=link> } })` and redirects to the returned URL. The server call does not redirect by itself.
    2.  The callback handles three outcomes:
        *   `identity_already_exists`: "This Google account is already in use";
        *   `access_denied`: no change;
        *   success: Google is listed in Profile.
    3.  Unlinking is out of scope.
*   **Races and stale values:**
    *   CUJ 9 is tested on the local stack.
    *   If OQ2 shows pending values cannot be cleared through the Admin API, the design relies on code expiry (600 s) and the tests that an expired or raced pending value can never attach.

### Threat model

| Threat | Handling | Tests | Residual risk / acceptor |
|---|---|---|---|
| Account enumeration on sign-in | Same screens, messages and states for new and existing users. Supabase creates unconfirmed users rather than failing. Error mapping never distinguishes. Limited requests shaped like normal ones. | Action tests with existing and new destinations give identical results; e2e compares screens. | Timing differences inside Supabase itself are not controlled. |
| Enumeration on Profile add flows | Supabase checks ownership first, so "already in use" is shown before any code. Per-user 5/day and per-IP 20/day limits, audit rows. | Limit tests; T4, T6. | Accepted by owner (v1). |
| Open redirect via `next` | `sanitizeNextPath` on every read. `redirectTo` built from `NEXT_PUBLIC_SITE_URL`, never the Host header. | Unit corpus (`//evil`, `/\evil`, `https:`, `%2F%2F`, control characters, `/login` loop); e2e `?login=1&next=//evil.com`. | None known. |
| Role escalation | No client grants on `user_roles`. Roles written only by definer functions. `has_role` takes no user id. Staff roles require `aal2`. | pgTAP: insert or update on `user_roles` denied; staff role false at aal1. | Future policies must use `has_role`. |
| Consent forgery | No client insert on `consents`. `finish_signup` and `record_consent` take no version or source; the version comes from `legal_versions`, the source from the session claim. | pgTAP: direct insert denied; forged version impossible; append-only. | None known. |
| OTP abuse and SMS pumping | Captcha in Supabase. +91-only normalisation and SMS hook. Supabase limits plus Postgres limits per IP and destination. Resend cooldown. Attempt cap. Phone disabled remotely until DLT. | Limiter pgTAP; action tests; hook tests when built. | Cost alert needed before phone goes live. |
| Session fixation | Session cookies set only after verify or code exchange. The step-up cookie is bound to the session id. Pre-auth state is cleared after use. | Callback and action tests. | None known. |
| Logging leaks | Allow-list logger. No codes, contacts, tokens or `next` in logs, events or URLs (except the OAuth `code`, which Supabase controls). | Logger unit tests; grep test over emitted events. | None known. |
| Pre-account takeover through Google linking | Cleanup of unconfirmed users. OQ3 checked before relying on linking. | Linking e2e for confirmed and pending orders. | Depends on OQ3. |
| Recycled phone numbers | Q13 step-up after 90 days of inactivity. | Gate unit tests; e2e with a backdated `last_seen_at`. | Phone-only accounts get only a confirmation choice. Accepted by owner. |
| Staff account reached from the patient site | Staff powers require `aal2`, which patient-site sessions never have. | pgTAP aal1 vs aal2. | Future staff checks must use the helper. |
| Placeholder legal versions in production | Production sign-up stays off while `LEGAL_VERSIONS` are `TODO_HCQ` (build-time check). | Unit test of the check. | None known. |

## Alternatives Considered

### Alternative A: Consent box on the first screen, carried in a signed cookie

*   **Pros**:
    *   Matches the original brief.
    *   New users finish one screen sooner.
    *   The tick happens before any account exists.
*   **Cons**:
    *   Without revealing who has an account, the server cannot tell new users from returning ones. Every returning user ticks a box that is thrown away (including marketing).
    *   It needs a signing secret and a cookie that must survive the code round trip and the Google redirect, which in-app browsers can lose.
    *   It needs a fallback "ask again" path anyway.
*   **Reason for Rejection**: Rejected by author: the server-side Finish sign-up gate gives one path for every method, with no cookie, no secret and no forgery surface.

### Alternative B: Users insert their own consent rows under row-level security

*   **Pros**: The simplest SQL, a direct insert from the server action.
*   **Cons**: Any signed-in user can post a row with any version, source or `granted` value straight to the database API, so consent can be forged.
*   **Reason for Rejection**: Rejected by author: consent is written only by `finish_signup()` and `record_consent()`, which take the version from `legal_versions` and the source from the session. The service-role key was also ruled out for this path by SUPABASE.md §8 rule 9.

### Alternative C: Create the profile and role with a trigger on every new auth user

*   **Pros**:
    *   One simple trigger, as in the original brief.
    *   Every user has a profile from the start.
*   **Cons**:
    *   Supabase creates a user when a code is *sent*, so typos and SMS pumping create profiles and roles.
    *   Staff accounts in the shared table would get the patient role.
    *   If the trigger raises, sign-up breaks in all three apps.
*   **Reason for Rejection**: Rejected by author (Q2): creation happens at Finish sign-up in one own-user function. A trigger on confirmation was also considered and rejected for the same shared-table risk.

### Alternative D: Sign the user out when they decline or close Finish sign-up

*   **Pros**: No session ever exists without consent.
*   **Cons**: An accidental close (swipe down, back button) throws away a paid SMS and forces a new code.
*   **Reason for Rejection**: Rejected by author (Q1): the user stays signed in but blocked at the gate. A variant with automatic deletion after 7 days was also not chosen.

### Alternative E: Block staff accounts from the patient site

*   **Pros**: Hard separation. A patient-site session can never belong to a staff account.
*   **Cons**:
    *   Staff need a second identity to book care for themselves.
    *   A staff role granted later to an existing patient account locks them out of their own history.
*   **Reason for Rejection**: Rejected by author (Q3): staff may use the site, and every staff-role check requires `aal2`.

### Alternative F: App-side captcha only, or no captcha

*   **Pros**: Scoped to the patient site, with no effect on the partner and admin apps. "No captcha" adds no third-party script.
*   **Cons**: Anyone can call Supabase's code endpoint directly with the public key, so an app-side check stops only bots that drive our UI. With no captcha, email code spam is limited only by rate limits.
*   **Reason for Rejection**: Rejected by author (Q4a): Supabase's built-in Turnstile captcha is enforced however the request arrives.

### Alternative G: Upstash Redis or in-memory rate limiting

*   **Pros**:
    *   Upstash is built for rate limiting and is named in §24.
    *   In-memory needs no store.
*   **Cons**:
    *   Upstash is a new dependency and data processor, needs keys per environment, and needs a mock locally.
    *   In-memory counters are per server instance and reset on cold starts, so they do not work on Vercel.
*   **Reason for Rejection**: Rejected by author (Q4b): a Postgres limiter, which the SMS hook can share. §24's Upstash mention changes through D21.

### Alternative H: `getUser()` on every request in the proxy

*   **Pros**:
    *   The literal rule from the original brief.
    *   Session revocation is seen immediately everywhere.
*   **Cons**:
    *   A network call to Supabase on every navigation for every signed-in user, against per-IP limits that may be shared through Vercel.
    *   Slower pages.
*   **Reason for Rejection**: Rejected by author (Q5): `getClaims()` in the proxy and `getUser()` in actions, protected pages, the gate and the callback.

### Alternative I: Tell a wrong code from an expired one using the send time

*   **Pros**: Clearer messages, as the original brief listed them.
*   **Cons**: Extra state that breaks across tabs and devices, and must match Supabase's expiry exactly. It is still a guess.
*   **Reason for Rejection**: Rejected by author (Q6): one honest message plus an attempt cap.

### Alternative J: A `roles` lookup table or a minimal enum

*   **Pros**:
    *   A table (as SUPABASE.md §7 plans) allows renaming and retiring roles.
    *   A minimal enum avoids naming roles that have no user yet.
*   **Cons**:
    *   A table turns typos into silent denials, and the generated types lose the union.
    *   A minimal enum still cannot be renamed.
*   **Reason for Rejection**: Rejected by author (Q7): the nine-value `app_role` enum from the brief.

### Alternative K: Drop email and phone from profiles, or sync them without a trigger

*   **Pros**: No copied personal data that can go stale, or (sync function) no trigger on `auth.users`.
*   **Cons**: Contacts would have to be read from auth for display, or would go stale when changed outside our flows.
*   **Reason for Rejection**: Rejected by author (Q8): keep the columns, synced by a minimal never-raise trigger on `auth.users`, accepted as the one exception.

### Alternative L: Delete consent rows with the account, or store a pseudonymous id

*   **Pros**:
    *   Cascade deletion leaves nothing behind.
    *   A pseudonymous id never modifies rows.
*   **Cons**:
    *   Cascade deletion removes all proof that consent was given.
    *   A pseudonymous id needs a secret key in the database layer and complicates policies.
*   **Reason for Rejection**: Rejected by author (Q9): `on delete set null`, with the guard allowing only that change.

### Alternative M: A local Supabase stack for every CI test, or auth tests only on developer machines

*   **Pros**:
    *   A full stack tests everything together.
    *   Local-only testing keeps CI fast.
*   **Cons**:
    *   A full stack slows every existing suite.
    *   Local-only means nothing in CI checks auth or RLS, contrary to TESTING.md.
*   **Reason for Rejection**: Rejected by author (Q10): a fail-safe app plus a separate auth project and database job on a local stack.

### Alternative N: Record recycled phone numbers as an accepted risk

*   **Pros**: Nothing to build while accounts hold no health data.
*   **Cons**: The risk grows as features add data, and depends on someone remembering it.
*   **Reason for Rejection**: Rejected by author (Q13): step-up after 90 days of inactivity.

### Alternative O: Reveal "already in use" only after proof of control, with our own verification service

*   **Pros**: Closes enumeration on the Profile add flows.
*   **Cons**:
    *   Supabase checks ownership before sending any code, so this needs our own code table, our own email and SMS sending (direct MSG91 access, not available yet), and service-role writes to auth.
    *   It is a second code system to secure.
*   **Reason for Rejection**: Rejected by author: accept Supabase's order, mitigated by rate limits.

### Alternative P: Merge or link phone accounts with Google/email accounts

*   **Pros**: One account per person.
*   **Cons**:
    *   A phone number cannot be matched to an email safely.
    *   Automatic merging risks joining two different people.
    *   A support merge needs identity checks that do not exist.
*   **Reason for Rejection**: Rejected by author: phone is a separate identity. Two accounts per person is a known v1 limitation, with no merge.

### Alternative Q: A Google-only launch

*   **Pros**: The cheapest launch, with no SMS or SMTP set-up.
*   **Cons**:
    *   Google blocks sign-in inside in-app browsers (WhatsApp, Instagram, Facebook).
    *   It contradicts §24, which names phone OTP as the patient method.
*   **Reason for Rejection**: Rejected by author: phone is primary, email is the interim method while DLT is pending, and Google is extra.

## Proposed Product Context Decision (D21, for the project lead to apply)

**D21: Patient sign-in methods and identity rules.** Patients sign in with a phone code (primary, once DLT is approved), an email code (Brevo, used while DLT is pending) and Google, enabled per environment by `AUTH_METHODS`.
- Google and email resolve to one account on a verified email. Phone sign-in never links automatically. Users can add a phone, add an email or connect Google from Profile, with no account merging.
- Consent is recorded through a server-side Finish sign-up gate.
- App rate limits use a Postgres limiter instead of Upstash.
- D4 processor register additions: Google (OAuth), Brevo (email), MSG91 (SMS, later), Cloudflare (Turnstile).
- Matching change to SUPABASE.md §12.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security and privacy.**
    *   No secrets in the repo; only variable names in `.env.example` files.
    *   The service-role key is server-only and limited to the rate limiter, the cleanup job and the unconfirmed-user lookup.
    *   Session cookies are httpOnly, `secure` outside local development, and `sameSite=lax`.
    *   No codes, phones, emails, tokens or `next` values in logs or events.
    *   Every table has row-level security and explicit grants.
    *   Production sign-up stays off while `LEGAL_VERSIONS` are `TODO_HCQ`.
*   **Performance.**
    *   Public pages stay statically prerendered (the header session state is a client island).
    *   The proxy makes no Supabase network call for visitors without a session cookie, and normally none for signed-in visitors (`getClaims()`).
    *   Each code send costs at most two `rate_limit_hit` calls.
    *   The login panel code loads only when opened (dynamic import), so Home's JavaScript size does not grow noticeably.
*   **Accessibility.**
    *   The panel is a modal dialog with a labelled title, focus trap, Escape to close, and focus returned to the trigger.
    *   Errors are announced (`aria-live`); no state is shown by colour alone.
    *   Targets are at least 44px; reduced motion is respected.
    *   It works at 360px and 1280px in English and Hindi.
*   **Rollout and rollback.**
    *   Methods switch on per environment through the remote Supabase settings first, then through `AUTH_METHODS` and a redeploy.
    *   The kill switch for a method is an `AUTH_METHODS` redeploy; for all sign-up, the remote `enable_signup` setting.
    *   App rollback is Vercel Instant Rollback.
    *   Migrations roll forward only. A prepared fix-forward migration that drops the Q8 sync trigger is kept ready.
    *   No remote setting is changed from a laptop; the project lead applies them from the checklist in `docs/AUTH.md`.

### Additional Resources

*   `docs/ACureXpress_Product_Context.md` §0, §14, §19, §22, §24
*   `docs/SUPABASE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `CLAUDE.md`
*   `concepts_brief.md` (EGM brainstorm, 2026-11-23)

### Future Improvements

*   A verified phone required before a first booking.
*   Account deletion and data export (§14), using the Q9 consent design.
*   Unlinking identities and changing an existing email or phone.
*   Turnstile and MFA for partner and admin sign-in.
*   Sentry with scrubbing and an SMS cost alert when phone goes live.
*   WhatsApp codes and passkeys through the `AuthMethod` interface.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Work happens in milestones, each passing lint, typecheck and tests before the next starts:

1.  **M1** Part A database.
2.  **M2** packages/core and packages/db.
3.  **M3** proxy and session.
4.  **M4** panel UI with phone and email codes.
5.  **M5** Google and callback.
6.  **M6** Part C Profile.
7.  **M7** CI, docs and drift check.

Docker must be running for M1 verification. If it is not, migrations and pgTAP tests are written but reported as not run. All database commands are local only.

### Target Files to Create/Modify

#### Supabase (Part A, local only)

1.  **`supabase/config.toml`** (Modify). *Type:* local stack config. *Changes:*
    *   site URL and redirect list on `localhost` (ports 3000, 3001, 3002, 3100, plus the `partners.localhost` and `admin.localhost` forms);
    *   email OTP length 6, expiry 600 s, `max_frequency` 30 s, raised local email quota, code-only templates;
    *   SMS enabled with test OTPs `+919000000001` to `+919000000005` all `123456`, commented as local-only;
    *   `[auth.external.google]` from `env(...)`;
    *   `[auth.captcha]` Turnstile from env, off when unset;
    *   `enable_manual_linking = true`;
    *   asymmetric signing keys;
    *   `auto_expose_new_tables = false`.

    Key names are checked against CLI 3.2. *Why:* a working local stack for all three methods with no secrets.
2.  **`supabase/templates/confirmation.html`, `magic_link.html`, `email_change.html`** (Create). *Type:* email templates. *Changes:* show only the 6-digit `{{ .Token }}` with plain en and hi text, and no link. *Why:* the email must send a code, not a link with a token in the URL.
3.  **`supabase/.env.example`** (Create). *Type:* example env. *Changes:* the names `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` and `SUPABASE_AUTH_CAPTCHA_SECRET`, without values. *Why:* documents what the git-ignored `supabase/.env` holds (already ignored by `.gitignore`).
4.  **`supabase/migrations/<ts>_foundation.sql`** (Create, via `pnpm supabase migration new foundation`). *Type:* SQL migration. *Changes:*
    *   enums `app_role`, `consent_type` and `auth_source`;
    *   `set_updated_at()`, and `has_role(app_role)` with the aal2 rule for non-patient roles;
    *   `audit_log` with append-only guard and revokes;
    *   `rate_limits` and `rate_limit_hit()` (execute for service_role and supabase_auth_admin only);
    *   `legal_versions`, seeded;
    *   a pg_cron cleanup schedule (skipped with a notice if pg_cron is unavailable locally);
    *   RLS on and explicit grants and revokes for every object;
    *   comments on every table and function.

    *Why:* Part A foundation.
5.  **`supabase/migrations/<ts>_identity.sql`** (Create). *Type:* SQL migration. *Changes:*
    *   `profiles`, `user_roles`, `consents` with RLS, policies, column-level grants and the consents guard (Q9);
    *   `my_auth_state()`, `finish_signup()`, `record_consent()`, `touch_last_seen()`;
    *   the `sync_contacts_from_auth` trigger on `auth.users` (Q8, never raises);
    *   `unconfirmed_users_older_than()` (service_role only).

    *Why:* Part A identity slice.
6.  **`supabase/tests/01_foundation.test.sql`** (Create). *Type:* pgTAP. *Changes:*
    *   exact grants on foundation objects;
    *   `has_role` at aal1 and aal2;
    *   audit_log append-only;
    *   the rate limiter counts, blocks and resets;
    *   `legal_versions` is readable and not writable.
7.  **`supabase/tests/02_identity.test.sql`** (Create). *Type:* pgTAP. *Changes:*
    *   the owner reads and updates only `full_name` and `preferred_language`;
    *   email, phone and id are not updatable;
    *   another user and anon are denied;
    *   `user_roles` is not writable by any client;
    *   consents have no client insert and are append-only, with only the set-null exception;
    *   `finish_signup` requires confirmation, is idempotent, takes source from the claim, writes all rows and audit entries, and cannot target another user;
    *   `record_consent` uses the current version;
    *   the sync trigger copies confirmed values only and never raises;
    *   `unconfirmed_users_older_than` is service_role only.
8.  **`supabase/seed.sql`** (Modify). *Type:* seed. *Changes:* a comment only. No auth users are seeded; tests create their own synthetic users. *Why:* keeps the seed free of identities (hard rule 2).

#### packages/core

9.  **`packages/core/src/phone.ts` + `phone.test.ts`** (Create). `normalizeIndianPhone` and `maskPhone`. Tests: valid prefixes and formats; rejects non-Indian numbers, 9 or 11 digits, a leading 0–5, and letters.
10. **`packages/core/src/email.ts` + `email.test.ts`** (Create). `normalizeEmail` (trim, lower case) and `maskEmail`, with tests.
11. **`packages/core/src/next-path.ts` + `next-path.test.ts`** (Create). `sanitizeNextPath` with an attack corpus: `//evil.com`, `/\evil`, `\\evil`, `https://evil`, `javascript:`, `%2F%2Fevil`, `%5C`, control characters, `/login`, `/auth/callback`, and `/hi/...` kept.
12. **`packages/core/src/auth-methods.ts` + `auth-methods.test.ts`** (Create). `AuthMethodId`, `AuthMethod` interface, `parseAuthMethods` (unset gives `["google"]`, phone ordered first, unknown values throw), and the method registry metadata.
13. **`packages/core/src/auth-errors.ts` + `auth-errors.test.ts`** (Create). The `AUTH_ERROR` closed list and `mapSupabaseAuthError`, covering at least `otp_expired`, `over_request_rate_limit`, `over_email_send_rate_limit`, `over_sms_send_rate_limit`, `captcha_failed`, `phone_exists`, `email_exists`, `identity_already_exists`, `validation_failed`, `user_banned`, network errors and unknowns. A test asserts the sign-in mapping never yields an existence-revealing key.
14. **`packages/core/src/auth-schemas.ts` + `auth-schemas.test.ts`** (Create). zod schemas for phone, email, OTP code, full name, marketing flag, and the action inputs.
15. **`packages/core/src/legal.ts` + `legal.test.ts`** (Create). `LEGAL_VERSIONS` (`TODO_HCQ`, `draft-2026-11`) and `isPlaceholderLegalVersion`.
16. **`packages/core/src/index.ts`** (Modify). Export the new modules.

#### packages/db

17. **`packages/db/src/cookies.ts` + `cookies.test.ts`** (Create). `authCookieOptions(env)`: httpOnly, secure unless local, sameSite lax, and a max age matching the session lifetime.
18. **`packages/db/src/server.ts`** (Modify). Pass `authCookieOptions`. Add `createAdminClient()` (service role, server-only, with a module comment listing the three permitted uses) and `rateLimitHit(keyHash, windowSeconds, max)`.
19. **`packages/db/src/middleware.ts`** (Modify). `updateSession(request, response)`: return early without an `sb-*` cookie; `getClaims()`; refresh near expiry; copy cookies onto the given response; fail safe without env (one warning without identifiers).
20. **`packages/db/src/env.ts` + `env.test.ts`** (Modify). Add `hasSupabaseEnv()` for fail-safe mode, `getServiceRoleKey()` (server only), and `assertProductionAuthEnv()` for the build-time check.
21. **`packages/db/src/client.ts`** (Modify). A comment that the browser client must not be used for auth (cookies are httpOnly). Kept for future public reads.
22. **`packages/db/src/database.types.ts`** (Create, generated by `pnpm db:types`). *Why:* typed queries.
23. **`packages/db/src/index.ts`** and **`packages/db/package.json`** (Modify). Export `Database` and the new helpers; add an `./admin` export entry for the server-only admin client.

#### apps/web: routing, session and server

24. **`apps/web/src/proxy.ts`** (Modify). Run the next-intl middleware, then `updateSession` on its response. The matcher excludes `auth/*` and `api/*` from locale handling, but `auth/*` still gets the session refresh. Locale behaviour is unchanged; existing redirect tests prove it.
25. **`apps/web/src/app/auth/callback/route.ts`** (Create). The OAuth and link callback described in Part B.
26. **`apps/web/src/app/auth/session/route.ts`** (Create). The header state endpoint, `no-store`.
27. **`apps/web/src/app/api/cron/auth-cleanup/route.ts`** (Create). The daily cleanup, `CRON_SECRET` bearer check.
28. **`apps/web/vercel.json`** (Create). The cron schedule for `/api/cron/auth-cleanup` (daily). *Why:* DEPLOYMENT.md says to add one only if needed; the cron needs it.
29. **`apps/web/src/features/auth/server/auth-state.ts` + test** (Create). `authState()` with the gate order and step-up rule.
30. **`apps/web/src/features/auth/server/rate-limit.ts` + test** (Create). HMAC key building (`RATE_LIMIT_HMAC_SECRET`), the limits table from Part B, and the client IP taken only from Vercel's forwarded header.
31. **`apps/web/src/features/auth/server/step-up.ts` + test** (Create). The step-up cookie, bound to the session id, httpOnly, 15 minutes.
32. **`apps/web/src/features/auth/actions.ts` + `actions.test.ts`** (Create). The server actions from Part B and Part C, with a mocked Supabase client in tests:
    *   validation failures;
    *   disabled methods rejected;
    *   limits;
    *   error mapping with no enumeration;
    *   `finishSignup` calls the function only once confirmed;
    *   `verifyOtp` result states;
    *   `signOut` is POST-only;
    *   Profile adds map `phone_exists` and `email_exists`;
    *   `connectGoogle` redirects.
33. **`apps/web/src/config/auth-methods.ts` + test** (Create). Reads `AUTH_METHODS` on the server through `parseAuthMethods`; the methods are passed as props.
34. **`apps/web/src/lib/log.ts` + `log.test.ts`** (Create). The allow-list logger and auth events. The test asserts redaction of phones, emails, codes, tokens and paths.
35. **`apps/web/src/lib/site-url.ts`** (Create). `siteUrl()` from `NEXT_PUBLIC_SITE_URL`, never the Host header.
36. **`apps/web/next.config.ts`** (Modify). Run `assertProductionAuthEnv()` during production builds: fail without Supabase env, and fail when `AUTH_METHODS` is non-empty while legal versions are placeholders and `VERCEL_ENV=production`.

#### apps/web: UI

37. **`apps/web/src/features/auth/components/auth-provider.tsx`** (Create). Context for panel open and close, return path (`sanitizeNextPath`), current step and error. Reads `?login=1&next=&step=&error=` on mount (inside Suspense) and removes them on close.
38. **`.../components/login-drawer.tsx`** (Create). A radix-ui Dialog styled as a right drawer at 420px from `md` and a bottom sheet at 90% height below. Focus trap, Escape and focus return; back button closes it on mobile.
39. **`.../components/login-panel.tsx`** (Create). Variants `drawer` and `page`; renders the steps.
40. **`.../components/step-header.tsx`** (Create). Brand panel with a small illustration (no claims), title and subtitle, and a back control.
41. **`.../components/phone-step.tsx`, `email-step.tsx`, `otp-step.tsx`, `finish-signup-step.tsx`, `step-up-step.tsx`, `google-button.tsx`, `turnstile-widget.tsx`, `user-menu.tsx`** (Create). As in Part B:
    *   the phone field shows +91 with a numeric keypad;
    *   the OTP step has a masked destination, a 30 s resend, and all states;
    *   Finish sign-up has the two unticked boxes (Terms and Privacy links open in a new tab, wording marked TODO_HCQ) and the name prefilled from Google;
    *   the Google button follows Google's branding;
    *   Turnstile is loaded manually;
    *   the user menu shows initials or the Google photo, My appointments, Profile, and a Logout form posting the action.
42. **`.../components/*.test.tsx`** (Create). Component tests in en and hi:
    *   method visibility per `AUTH_METHODS` (phone first; Google only);
    *   phone validation;
    *   OTP paste and auto-submit;
    *   resend timer (fake timers);
    *   every error state;
    *   Finish sign-up gating (submit disabled until Terms is ticked; marketing unticked by default);
    *   step-up choices;
    *   focus trap and Escape;
    *   user menu.
43. **`.../components/auth-link-interceptor.tsx`** (Create). Client helper: clicks on `/login?next=` links open the panel when JavaScript is available.
44. **`apps/web/src/app/[locale]/(public)/login/page.tsx`** (Create). Page variant, noindex, signed-in users redirected to `next`, works without JavaScript (server-rendered form posting the send action).
45. **`apps/web/src/app/[locale]/(patient)/layout.tsx`** (Modify). Guard: `getUser()` plus `authState()`; redirect to `/login?next=` or to the gate.
46. **`apps/web/src/app/[locale]/(patient)/appointments/page.tsx`** and **`(patient)/account/page.tsx`** (Create). Signed-in placeholders. Account shows name, email and phone from the profile, the add-phone, add-email and connect-Google actions, the marketing toggle and Logout.
47. **`apps/web/src/features/auth/components/contact-actions.tsx` + test** (Create). The Profile add-phone, add-email and connect-Google UI and states.
48. **`apps/web/src/app/[locale]/(public)/layout.tsx`** (Modify). Wrap in `AuthProvider` and mount `LoginDrawer` (dynamically imported) plus the link interceptor.
49. **`apps/web/src/components/layout/site-header.tsx`** (Modify). Replace the Login button with a client `HeaderAuth` island showing Login, "Finish sign-up" or the user menu from `/auth/session`. The header stays static.
50. **`apps/web/src/components/layout/mobile-bottom-nav.tsx` + test** (Modify). "Account" opens the panel when signed out (it links to `/login?next=/account`; the interceptor opens the panel).
51. **`apps/web/src/config/stub-pages.ts`** (Modify). Remove `login`, `appointments` and `account`; keep `account/privacy` (consent preferences) as a stub. Footer link tests are updated on purpose.
52. **`apps/web/src/app/[locale]/layout.tsx`** (Modify). Add `auth` to `CLIENT_NAMESPACES`.
53. **`apps/web/src/i18n/messages/en.json`, `hi.json`** (Modify). The `auth` namespace: steps, labels, errors, Finish sign-up wording (TODO_HCQ legal), step-up, Profile contact messages and user menu. Hindi is first-pass TODO-review. Parity and no-partner-or-admin copy tests apply.

#### apps/web: tests and CI

54. **`apps/web/playwright.config.ts`** (Modify). Add an `auth` project. It uses a separate webServer on port 3100 that gets its env from the local stack (`supabase status -o env`), with `AUTH_METHODS=phone,email,google`. Existing projects run unchanged, with no Supabase.
55. **`apps/web/e2e/auth/*.spec.ts`** (Create). Against the local stack:
    *   email code happy path (code read from the Mailpit API);
    *   phone code with test numbers and `123456`;
    *   wrong and expired codes;
    *   attempt cap;
    *   returning user skips Finish sign-up;
    *   declining Finish sign-up keeps them blocked (CUJ 5);
    *   a protected route redirects and returns;
    *   logout;
    *   `?login=1&next=//evil.com` stays on site;
    *   identity tests 1 to 9: test 1 and 2 use a mocked Google callback plus manual staging checks; 3 to 8 run with codes; 9 is the no-enumeration comparison plus limits;
    *   step-up with a backdated `last_seen_at`;
    *   an axe scan of the open panel at 360px and 1280px in en and hi;
    *   Home still prerendered.
56. **`apps/web/src/app/auth/callback/route.test.ts`** (Create). A mocked code exchange: success, missing verifier, `access_denied`, `identity_already_exists`, link flow, sanitised `next`, gate redirect.
57. **`.github/workflows/ci.yml`** (Modify). Turn on the `database` job (local stack, `db reset`, `test db`, `db lint`, generated types diff). Add an `e2e-auth` job (local stack plus the Playwright `auth` project). Existing e2e jobs are unchanged. No remote credentials.
58. **`package.json`** (root) (Modify). `db:types` becomes explicitly local (`supabase gen types --local ...`), with a comment that every db script targets the local stack because the checkout is linked to a remote project.
59. **`turbo.json`** (Modify). Add `AUTH_METHODS`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (already matched by `SUPABASE_*`) to the build, dev, start and test:e2e env lists.

#### Docs and env

60. **`apps/web/.env.example`** and root **`.env.example`** (Modify). The new variables grouped by app, with local values documented (`AUTH_METHODS=phone,email,google`) and deployed guidance (`email,google` until DLT). Names only.
61. **`docs/specs/auth.md`** (Create). This design, finalised.
62. **`docs/AUTH.md`** (Create).
    *   How sign-in works, and env variables per app.
    *   Local recipes: test numbers and the fixed code, the Mailpit URL, Google local set-up and redirect URIs.
    *   A manual Google test checklist (identity tests 1, 2 and 7).
    *   The remote settings table (local / staging / production).
    *   The enable checklist: Brevo SMTP and domain verification, DLT and MSG91 through the Send-SMS hook, Turnstile keys, redirect URLs, signing keys, and the D4 entries.
    *   The note that a verified phone is required before a first booking (future).
63. **`docs/rls-matrix.md`** (Create). Roles by tables and functions (select, insert, update, delete, execute). This is the file the docs rule allows us to add.
64. **`docs/SUPABASE.md`** (Modify, one rule only). "Every migration that creates a table also grants the exact privileges needed to anon, authenticated or service_role, and nothing more." Nothing else changes. The §12 change goes into D21 for the lead.
65. **`CLAUDE.md`** (Modify). New paths (`features/auth`, `(patient)` guard, `docs/AUTH.md`, `docs/rls-matrix.md`), new variables, and the `[slug]` to `[...slug]` drift fix.
66. **`concepts_brief.md`, `design_draft.md`** (Delete after `docs/specs/auth.md` is written). Working artefacts; the spec replaces them.

### Verification Plan

*   **Database (local, Docker required):** `pnpm db:start`, `pnpm db:reset`, `pnpm db:test`, `pnpm supabase db lint`, `pnpm db:types`.
*   **Build and static checks:** `pnpm lint`, `pnpm typecheck`, `pnpm build` (Home still prerendered; the production build check works).
*   **Unit and component tests:** `pnpm test` (all workspaces), covering files 9–17, 20, 29–34, 42, 47, 50 and 56.
*   **E2E:** `pnpm test:e2e` (existing projects unchanged, plus the `auth` project against the local stack); axe zero critical or serious on the open panel at 360px and 1280px in en and hi.
*   **Manual:** `pnpm dev --filter=@acurexpress/web` (another port if 3000 is busy). Screenshots of every panel state at 360px and 1280px in en and hi. The Google manual checklist from `docs/AUTH.md` when Google credentials are configured locally.
*   **Coverage:** per TESTING.md, 95% on `sanitizeNextPath`, `authState`, the server actions and the consent functions (critical list); 80% overall.
*   **EGM drift check** against `docs/specs/auth.md` after the build (`/egm:egm-drift-report`), and a second Goldfish review of the security-critical parts if the drift is significant.

--------------------------------------------------------------------------------

## Identity Tests T1 to T9 (owner-defined, 2026-11-23)

| ID | Test | How it runs |
|---|---|---|
| T1 | Google first, then email code with the same verified email: one account. | Callback unit test with a mocked exchange, plus the manual Google checklist in `docs/AUTH.md`. |
| T2 | Email code first, then Google with the same email: one account. | As T1. |
| T3 | Add a free phone to a Google/email account: succeeds after the code. | Auth e2e (email account, test phone `+919000000002`, code `123456`). |
| T4 | Add a taken phone: "This number is already in use.", and neither account changes. | Auth e2e (two accounts; database state checked through a service-role test helper). |
| T5 | A phone account adds a free email: succeeds after verification. | Auth e2e (code read from Mailpit). |
| T6 | A phone account adds a taken email: fails, no merge. | Auth e2e. |
| T7 | A phone account adds email X, then signs in with Google using X: Google links to the phone account. | Manual Google checklist only. The expected result is documented; e2e cannot drive Google. |
| T8 | An abandoned or raced phone change never attaches a number to the wrong user. | Auth e2e (CUJ 9) plus action tests. |
| T9 | No sign-in response reveals account existence; Profile add flows are rate limited. | Action tests comparing new and existing destinations, plus limiter tests. |

## Review Log (Stage 9, round 1, 2026-11-23)

**Source:** `implementation_readiness_report.md` (3 reviewers, all completed: 9 Blockers, 28 Majors, 13 Nits).

**Owner direction for resolution:** the project is in early development. The goal is working sign-in so that signed-in features can be built next, while choosing designs that will not cause problems later. So the resolutions prefer the simplest option that keeps the security properties, and avoid new dependencies. Every finding was accepted, so none was contested.

**These resolutions are normative.** Where one conflicts with the Detailed Implementation Plan or the Technical Plan above, the resolution wins.

A second Stage 9 round followed in the implementing session; see "Review Log (Stage 9, round 2)" below, which overrides this round where they conflict.

### Blockers

*   **B1 (production env check breaks CI): FIX.** The build check runs only when `VERCEL_ENV === "production"`, never on `NODE_ENV`. CI and local `next build` are unaffected. It lives in `apps/web/src/config/env-check.ts`, called from `next.config.ts`. `VERCEL_ENV` is added to turbo.json (M6).
*   **B2 (Playwright auth project collides): FIX.** The auth suite gets its own config:
    *   `apps/web/playwright.auth.config.ts`, with `testDir: "./e2e-auth"`, port **3200**, `workers: 1`, `fullyParallel: false`, and its own webServer (`pnpm build && pnpm start --port 3200`) using the local-stack env from M19;
    *   new script `test:e2e:auth` in `apps/web/package.json`;
    *   new turbo task `test:e2e:auth` (cache off).

    `playwright.config.ts` and the existing `e2e/` folder are not changed.
*   **B3 (identity tests undefined): FIX.** Defined in the table above. Items 55 and 56 refer to T1–T9 by these IDs.
*   **B4 (`docs/AUTH.md` and the SUPABASE.md rule break the CLAUDE.md docs rule): FIX.** Both were explicitly requested by the owner in the auth task brief. File list addition: `CLAUDE.md` docs rule amended to allow `docs/AUTH.md` as a new file and to note the one owner-approved SUPABASE.md rule.
*   **B5 (legal guard bypassable): FIX.** Simpler and safer than a build failure:
    *   When `VERCEL_ENV === "production"` and any `LEGAL_VERSIONS` value is a placeholder, `parseAuthMethods` returns `[]`. Sign-in is hidden, and every auth action returns `method_disabled`, whatever `AUTH_METHODS` says.
    *   The remote checklist also requires `enable_signup = false` in production until real versions exist.
    *   Unit test included.
*   **B6 (step-up cookie integrity, phone detection): FIX.** No cookie; the state lives in the database.
    *   The `verifyOtp` action knows it verified a phone code (`type: "sms"`).
    *   If `my_auth_state().last_seen_at` is older than 90 days, it calls `begin_step_up()`, a definer function on the caller's own row that sets `profiles.step_up_required_at = now()`.
    *   The gate returns `step_up` while that column is set.
    *   `complete_step_up(p_choice text)` clears it and writes an audit row. `p_choice` is one of `second_factor` or `confirmed_owner`. It runs after the email code or Google sign-in succeeds, or after the "Yes, this is my account" choice.
    *   "No, this is a new number" signs the user out without clearing it.
    *   pgTAP and action tests included.
*   **B7 (audit rows have no writer): FIX.** Audit rows are written only by:
    *   `finish_signup` (`role.granted`, `consent.recorded`);
    *   `record_consent` (`consent.recorded`);
    *   `complete_step_up` (`step_up.completed`, with the choice in `metadata`);
    *   the Q8 trigger `sync_contacts_from_auth` (`contact.changed`, with metadata `{field: "email"|"phone"}` and no values).

    Attempts are not audited (the limiter covers them). pgTAP checks each writer.
*   **B8 (audit_log guard blocks user deletion): FIX.** `audit_log.actor_id` is a plain nullable uuid with **no foreign key**, so deleting a user never updates `audit_log`. The append-only guard then has no exceptions. Rows keep only an opaque id, with no personal data.
*   **B9 (config cannot be built as written): FIX.** The committed `supabase/config.toml` has:
    *   `[auth.external.google] enabled = false`, with `client_id`/`secret` from `env(...)`;
    *   `[auth.captcha] enabled = false`.

    `docs/AUTH.md` explains switching them on locally (set the env in `supabase/.env`, flip the flag, restart). Signing keys:
    *   `supabase gen signing-key` writes `supabase/signing_keys.json`, ignored by `supabase/.gitignore`;
    *   `[auth] signing_keys_path = "./signing_keys.json"`;
    *   CI generates the key before `supabase start`.

    If CLI 3.2 lacks this command, keep symmetric keys locally. `getClaims()` then falls back to a network check, which is acceptable locally, and the gap is recorded in `docs/AUTH.md`.

### Majors

*   **M1: FIX.** Milestone file map:
    *   M1: items 1–8, plus root `package.json` (`db:types --local`), plus 22;
    *   M2: 9–21, 23;
    *   M3: 24, 35, 36, plus proxy tests;
    *   M4: 29–34, 37–43, 48–53;
    *   M5: 25, 56;
    *   M6: 44–47 and Part C;
    *   M7: 26–28, 54–66.
*   **M2: FIX.** The existing matcher stays. In code, `proxy.ts` skips next-intl when the path starts with `/auth/` (callback, session) and still calls `updateSession`; `/api/*` stays excluded by the matcher. New tests:
    *   `apps/web/src/proxy.test.ts` (no cookie means no Supabase call; `/auth/*` is not locale-prefixed);
    *   an e2e locale-redirect regression (`/en` to `/`, `Accept-Language: hi` to `/hi`) in the existing `e2e/home.spec.ts`.
*   **M3, M4: FIX.**
    *   The admin client lives only in `packages/db/src/admin.ts`, exported as `@acurexpress/db/admin`.
    *   It reads `SUPABASE_SERVICE_ROLE_KEY` itself and throws if `typeof window !== "undefined"`. The `server-only` package is not added.
    *   `env.ts` gains only `hasSupabaseEnv()`.
    *   `admin.ts` exports `createAdminClient()`, `rateLimitHit()`, `rateLimitReset()` and `rateLimitsCleanup()`.
*   **M5: FIX.** The production check lives in `apps/web/src/config/env-check.ts` (B1). `packages/db` has no `assertProductionAuthEnv`.
*   **M6: FIX.** turbo.json build, dev, start, test:e2e and test:e2e:auth env lists add `VERCEL_ENV`, `AUTH_METHODS`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `RATE_LIMIT_HMAC_SECRET` and `CRON_SECRET`. `SUPABASE_*` is already matched (N5).
*   **M7: FIX.** The foundation migration runs `create extension if not exists pg_cron` and schedules the cleanup. If pg_cron is unavailable it raises a notice. `rate_limits_cleanup()` is also granted to `service_role` and called by the cron route, so either path works.
*   **M8: FIX.**
    *   Verify attempts use key `verify:<hmac(dest)>`, window 600 s (the code expiry), max 5.
    *   A successful send calls `rate_limit_reset(key)` (definer, service_role only) for that destination.
    *   After 5 failures the verify action returns `too_many_attempts` without calling Supabase, until a new code is sent.
*   **M9: FIX.**
    *   The client IP is the first value of `x-forwarded-for` (set by Vercel).
    *   Locally and in CI it is `"local"`.
    *   If the header is missing in production, the key is `"unknown"`: a shared bucket, fail closed.
*   **M10: FIX.**
    *   Only Google uses PKCE, through a server client with `flowType: "pkce"`.
    *   Phone and email code actions use a separate server client with `flowType: "implicit"`. `verifyOtp` with a token does not need a verifier, so OTP sends never overwrite the Google verifier.
    *   No flow id is needed. The callback's `flow=link` query is only a mode flag.
    *   The "missing verifier" callback test covers the code-verifier cookie being absent.
*   **M11: FIX.** Redirect entries use path globs: `http://localhost:3000/**`, `http://localhost:3200/**`, `http://localhost:3001/**`, `http://localhost:3002/**`, `http://partners.localhost:3001/**`, `http://admin.localhost:3002/**`. `site_url` is `http://localhost:3000`.
*   **M12: FIX.** The no-JavaScript `/login` flow is dropped for v1, since Turnstile needs JavaScript anyway. `/login` renders the client panel, with a `<noscript>` message asking the user to enable JavaScript.
*   **M13: FIX.**
    *   The check runs in **each protected page**, not the layout. A `requirePatient(nextPath)` helper (`features/auth/server/require-patient.ts`) calls `getUser()` and `authState()`, then:
        *   redirects to `/login?next=<path>` when signed out;
        *   redirects to `/login?next=<path>&step=finish` (or `&step=step_up`) when the gate is needed.
    *   Because `cacheComponents` is on, each protected page's user-specific body sits inside `<Suspense>`, and the helper is awaited inside that boundary.
    *   `(patient)/layout.tsx` provides the same shell as `(public)` (emergency bar, header, footer, bottom nav) and no auth logic.
*   **M14: FIX.** No globs:
    *   item 41 is eight separate files;
    *   item 42 is `phone-step.test.tsx`, `otp-step.test.tsx`, `finish-signup-step.test.tsx`, `step-up-step.test.tsx`, `login-panel.test.tsx`, `user-menu.test.tsx`;
    *   item 55 is `e2e-auth/email-otp.spec.ts`, `phone-otp.spec.ts`, `gate.spec.ts`, `profile-contacts.spec.ts`, `redirects.spec.ts`, `a11y.spec.ts`;
    *   new: `apps/web/e2e-auth/helpers.ts` (Mailpit reader, service-role test helper, limiter reset) and `apps/web/scripts/auth-e2e-env.sh` (M19).
*   **M15: FIX.** Signed in: the bottom-nav "Account" goes to `/account`, and the link interceptor does nothing (normal navigation). Signed out: the interceptor opens the panel. Covered by a component test.
*   **M16: FIX.**
    *   `Sheet`/`Dialog` primitives are added to `packages/ui` (new `packages/ui/src/components/sheet.tsx` plus a test, exported from the index) on the `radix-ui` dependency it already has.
    *   apps/web imports schemas and parse helpers only from `@acurexpress/core` and never imports zod directly.
    *   No new dependencies.
*   **M17: FIX.** `[auth.email] enable_confirmations = true` and `[auth.sms] enable_confirmations = true`, so users stay unconfirmed until the code is verified (G5, Q2 cleanup).
*   **M18: FIX.**
    *   Test OTPs use the CLI's table form without "+" (`[auth.sms.test_otp]`, `919000000001 = "123456"` through `919000000005`).
    *   `[auth.email] otp_length = 6`, `otp_expiry = 600`, `max_frequency = "30s"`.
    *   `[auth.rate_limit]` is raised locally for e2e (local only).
    *   The exact key names are checked against CLI 3.2 during the build, and any deviation is recorded in the spec.
*   **M19: FIX.**
    *   `apps/web/scripts/auth-e2e-env.sh` runs `supabase status -o env` and maps `API_URL` to `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` to `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SERVICE_ROLE_KEY` to `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.test.local` (git-ignored).
    *   It also sets fixed test values for `RATE_LIMIT_HMAC_SECRET` and `CRON_SECRET`, plus `AUTH_METHODS=phone,email,google` and `NEXT_PUBLIC_SITE_URL=http://localhost:3200`.
    *   Google is not driven in e2e (T1, T2 and T7 as above).
*   **M20: FIX.**
    *   The auth suite runs serially (B2).
    *   The local GoTrue limits are raised in `config.toml`.
    *   `e2e-auth/helpers.ts` clears `rate_limits` before each test through the service-role helper. One dedicated test checks the app limit with a low override (`AUTH_TEST_LIMIT_OVERRIDE`, honoured only when `NODE_ENV !== "production"`).
*   **M21: FIX.**
    *   pgTAP simulates users with `set local role authenticated` and `set local request.jwt.claims = '{"sub":"...","aal":"aal1","app_metadata":{"provider":"phone"}}'`, so no helper extension is needed.
    *   Indexes: `consents (user_id, consent_type, created_at desc)`, `audit_log (actor_id)`, `audit_log (created_at)`.
    *   Names follow SUPABASE.md §7 (snake_case, `_at` timestamps).
    *   Tests are added for `begin_step_up`, `complete_step_up` and `rate_limit_reset`.
*   **M22: FIX.** Tests are listed for:
    *   `rate-limit.ts` (HMAC keys, IP rules);
    *   `require-patient.ts`;
    *   `admin.ts` (throws in a browser, reads the key);
    *   `proxy.ts` (M2);
    *   the cron route (rejects a missing or wrong `CRON_SECRET`, deletes only from the definer list);
    *   `env-check.ts` (B1, B5).
*   **M23: FIX.** "Home still prerendered" is checked by a Vitest file, `apps/web/src/app/prerender.test.ts`, that reads `.next/prerender-manifest.json` after build and asserts `/en` and `/hi` are present. It runs in `pnpm test` only when `.next` exists, and in CI after the build step.
*   **M24: FIX.** `mapSupabaseAuthError` also covers:
    *   `signup_disabled`, `provider_disabled`, `email_provider_disabled`, `phone_provider_disabled`, `otp_disabled`;
    *   `bad_code_verifier`, `flow_state_not_found`, `flow_state_expired`;
    *   `user_not_found`, `sms_send_failed`, `email_address_invalid`, `over_request_rate_limit`, `session_not_found`.

    On sign-in screens all of these map to generic keys (`unavailable`, `invalid_or_expired`, `rate_limited`, `try_again`). A test asserts no sign-in key differs between new and existing users.
*   **M25: FIX.** Removing the `login`, `appointments` and `account` stubs needs these updates:
    *   `apps/web/src/config/footer-links.test.ts` (dead-link check accepts the real pages);
    *   `apps/web/e2e/patient-only.spec.ts` (drop `/appointments` and `/account` from the 200-expected list; `/login` stays);
    *   `apps/web/e2e/footer.spec.ts` (links through `/login?next=` still resolve to 200);
    *   `apps/web/e2e/home.spec.ts` (CTA list keeps `/login`).

    The `pages.login`, `pages.appointments` and `pages.account` message keys stay as page titles.
*   **M26: FIX (deferred enforcement).** Coverage numbers in TESTING.md stay the target. Adding `@vitest/coverage-v8` and thresholds is an **ask-first dependency item for the owner**. Until approved, coverage is not enforced in CI. Recorded in `docs/AUTH.md`.
*   **M27: FIX.** The panel states are:
    *   `idle`, `sending`, `code_sent`, `verifying`;
    *   `invalid_or_expired`, `too_many_attempts`, `rate_limited`, `captcha_failed`, `network_error`, `method_disabled`, `unavailable`;
    *   `needs_finish`, `step_up`, `success`.

    Profile states: `in_use_phone`, `in_use_email`, `in_use_google`, `added`, `cancelled`.
*   **M28: FIX.** After the build, `/egm:egm-drift-report docs/specs/auth.md` runs. Any drift finding of Major or higher in the consent functions, `/auth/callback`, RLS and grants, `sanitizeNextPath`, `authState` or the step-up path triggers a second Goldfish review of those parts.

### Nits

*   **N1:** item 61 is "Modify" (finalise status and review log).
*   **N2:** deleting `concepts_brief.md`, `design_draft.md` and the review reports needs the owner's go-ahead.
*   **N3:** session cookie max age is 30 days, matched by the remote session settings.
*   **N4:** `signOut` uses `scope: "local"` (this device) and is tested as POST-only; the action name stays `verifyOtp`.
*   **N5:** the `SUPABASE_SERVICE_ROLE_KEY` entry is not added to turbo.json (already matched).
*   **N6:** `LoginDrawer` is loaded through a small client wrapper, `features/auth/components/login-drawer-lazy.tsx`, using `next/dynamic` with `ssr: false`.
*   **N7:** `supabase/.env` and `supabase/signing_keys.json` are ignored by `supabase/.gitignore` (both entries added and verified).
*   **N8:** the SMS hook receives already-normalised numbers and computes its key with a secret from Supabase Vault when it is built (phone go-live, not this task).
*   **N9:** `finish_signup` takes `source` from the session's `amr` claim (the method actually used), falling back to `app_metadata.provider`.
*   **N10:** the panel illustration shows a generic phone and calendar shape, and the panel copy makes no service or delivery promises.
*   **N11:** Hindi strings are a first draft for native-speaker and HCQ review (marked `_meta` in `hi.json`).
*   **N12:** the `vercel.json` rationale reads "needed for the daily cleanup cron".
*   **N13:** the milestone intro is shortened.

--------------------------------------------------------------------------------

## Review Log (Stage 9, round 2, 2026-11-23)

**Source:** the same three reviewers ran twice, independently.
*   The synthesizer swarm wrote `implementation_readiness_report_round2.md` (3 Blockers, 25 Majors, 14 Nits, its own numbering).
*   A direct swarm returned 2 Blockers, 17 Majors and 8 Nits after deduplication.
*   The `R2-…` ids below are the Elephant's merge of both. Every finding in either sample is resolved here; R2-M18 onwards cover what only the synthesizer sample raised.

**Precedence.** This round is normative. It overrides round 1 and the plan above wherever they conflict. Round-1 entries are cited as `R1-B6`, `R1-M10` and so on. "Milestone 1" to "Milestone 7" always means the build milestones (R2-N1).

**Owner direction applied:** simplest option that keeps the security properties, no new dependencies. Every finding was accepted; none was contested.

**Facts checked before resolving:**
*   `createServerClient` forces `flowType: "pkce"` (`@supabase/ssr/src/createServerClient.ts:165-175`).
*   `amr` is `otp` for both phone and email codes (`auth-js/src/lib/types.ts:388-402`).
*   JWT claims carry `session_id` (`types.ts:2364`).
*   `supabase gen signing-key` exists in CLI 3.2.0 (local only).

### Blockers

*   **R2-B1 (step-up bypass): FIX. This replaces R1-B6 and plan item 31.** Detection moves into the database and is bound to the session.
    *   `profiles` gains `step_up_cleared_session uuid` (nullable). No client grant covers it.
    *   `my_auth_state()` also returns `needs_step_up boolean`. It is true when all three hold:
        *   `last_seen_at` is not null (null means a new account, never stale);
        *   `last_seen_at < now() - interval '90 days'`;
        *   `step_up_cleared_session is distinct from (auth.jwt()->>'session_id')::uuid`.

        Because the database computes this for any session, a phone sign-in made directly against GoTrue is caught too.
    *   `touch_last_seen()` does nothing while `needs_step_up` is true, so the evidence is kept.
    *   `complete_step_up()` takes no parameters. It is security definer, execute is granted to `authenticated` only, and it acts on the caller's own row. It succeeds only if one of these holds:
        *   **(a) This session was created with email or Google.** An `auth.identities` row with provider `email` or `google` for this user has a `last_sign_in_at` within 10 seconds of this session's `auth.sessions.created_at`.
        *   **(b) The account is phone-only.** There is no non-phone identity and no confirmed email. This is the "Yes, this is my account" choice.

        On success it sets `step_up_cleared_session` to the current `session_id` and `last_seen_at = now()`, and writes audit `step_up.completed` with metadata `{via: "non_phone_sign_in" | "phone_only_confirmed"}`. Otherwise it raises, and nothing changes.
    *   `begin_step_up()` is dropped.
    *   **App flow when the gate sees `needs_step_up`:**
        1.  The server calls `complete_step_up()` once. If it succeeds (any email or Google sign-in), the user notices nothing.
        2.  If it fails and the account has email or Google, the step-up step offers a code to the masked account email or "Continue with Google". The code is sent by `sendStepUpEmailOtp` through `signInWithOtp({ email: user.email, options: { shouldCreateUser: false } })`. Verifying creates a new session, which passes condition (a).
        3.  If the account is phone-only, the step offers "Yes, this is my account", which calls `complete_step_up()` (condition b), and "No, this is a new number", which signs out and points to Contact us.
    *   **New open question OQ7, checked first in Milestone 1:** does GoTrue update `auth.identities.last_sign_in_at` on email-code and Google sign-ins (not only phone)? If it does not, building stops and the owner is asked. There is no silent fallback.
    *   **pgTAP:** stale versus fresh; null `last_seen_at`; conditions (a) and (b); refusal for a phone session on an account with email; a cleared session does not clear another session; `touch_last_seen` is a no-op while stale.
*   **R2-B2 (auth e2e env never loaded): FIX.**
    *   `scripts/auth-e2e-env.sh` writes `apps/web/.env.test.local` as in R1-M19.
    *   `apps/web/playwright.auth.config.ts` calls `process.loadEnvFile(".env.test.local")` (Node 22, no dependency). This loads the values into the Playwright process, so `e2e-auth/helpers.ts` sees them.
    *   It passes the same values explicitly in `webServer.env`, together with `NEXT_DIST_DIR=.next-auth`.
    *   `next.config.ts` sets `distDir: process.env.NEXT_DIST_DIR ?? ".next"`. The auth build therefore never overwrites the normal `.next`, and the two suites may run one after the other in any order. `.next-auth` is git-ignored (checked in Milestone 3).

### Majors

*   **R2-M1 (PKCE forced): FIX. Replaces R1-M10.**
    *   `packages/db/src/server.ts` adds `createOtpSenderClient()`: a cookie-less `createClient` from `@supabase/supabase-js` (already a dependency of packages/db) with `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false` and the anon key.
    *   It is used only for `sendPhoneOtp`, `sendEmailOtp` and `sendStepUpEmailOtp`, so a code send never touches the code-verifier cookie.
    *   `verifyOtp` (token based, needs no verifier), Google start and link, and the callback use the cookie SSR client (PKCE).
    *   **Accepted:** Profile `updateUser({ email })` on the SSR client stores a verifier. If the same user runs add-email and connect-Google at the same moment, the Google callback fails as `unavailable` and they retry.
*   **R2-M2 (consent source): FIX. Replaces R1-N9.**
    *   The enum becomes `consent_source` with values `phone`, `email`, `google` and `profile`.
    *   `finish_signup(p_full_name text, p_marketing boolean, p_source consent_source)` accepts `phone`, `email` or `google` only. It raises unless the user has an `auth.identities` row for that provider.
    *   The action passes the method it actually verified: `verifyOtp` with `sms` means `phone`, `email` means `email`, and the callback means `google`.
    *   `record_consent` (the Profile toggle) writes `profile`.
    *   pgTAP: a forged source for which the user has no identity is rejected.
*   **R2-M3 (`/login` loop): FIX.**
    *   `/login` redirects to `next` only when `authState()` is `signed_in`.
    *   For `needs_finish` and `step_up` it renders the panel at that step.
    *   For `signed_out` it renders the first step.
    *   A test covers each case.
*   **R2-M4 (environment detection): FIX.**
    *   The deployed check is `process.env.VERCEL === "1"`.
    *   Client IP when deployed: the first `x-forwarded-for` value, or `"unknown"` if missing (a shared bucket). When not deployed: `"local"`.
    *   `AUTH_TEST_LIMIT_OVERRIDE` is dropped. App limits are tested in `rate-limit.test.ts` and `actions.test.ts` with an injected limiter, and the database limiter in pgTAP. The auth e2e run does not exercise limits; it clears `rate_limits` before each test.
*   **R2-M5 (env check and method parsing): FIX. Replaces item 36 and refines R1-B1 and R1-B5.**
    *   `parseAuthMethods(value: string | undefined, opts: { blockAll: boolean }): AuthMethodId[]`. It stays pure.
    *   `isPlaceholderLegalVersion(v)` returns `v.startsWith("draft-")`.
    *   `apps/web/src/config/auth-methods.ts` computes `blockAll = process.env.VERCEL_ENV === "production" && any LEGAL_VERSIONS value is a placeholder`.
    *   `apps/web/src/config/env-check.ts` is self-contained: plain `process.env` and **no workspace imports**, so `next.config.ts` never loads package TypeScript.
        *   It throws only when `VERCEL_ENV === "production"` and any of these is missing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
        *   Placeholder legal versions never fail a build; the runtime `blockAll` rule handles them.
*   **R2-M6 and R2-M7 (milestones and file list): FIX.** The "Final file list by milestone" below supersedes the milestone map in R1-M1 and the placement of items 1 to 66. Item 31 is deleted.
*   **R2-M8 (fail-safe without Supabase env): FIX.** `hasSupabaseEnv()` short-circuits the following, so env-less CI and e2e keep passing (`/login` returns 200):
    *   the proxy skips session work;
    *   `/auth/session` returns `signed_out`;
    *   every action returns `unavailable`;
    *   `/login` renders the panel with an "unavailable" notice;
    *   `requirePatient` redirects to `/login?next=`.
*   **R2-M9 (e2e helpers): FIX.**
    *   `e2e-auth/helpers.ts` imports `@acurexpress/db/admin`; apps/web already depends on `@acurexpress/db`.
    *   Accounts are checked with `auth.admin.getUserById` / `listUsers`.
    *   service_role gets `select, delete` on `rate_limits`, and `select` on `profiles`, `user_roles`, `consents` and `audit_log`. There is no update or delete on the append-only tables.
    *   All of this is listed in `docs/rls-matrix.md` and tested in pgTAP.
*   **R2-M10 (local config literals): FIX.** The key names are verified against CLI 3.2 in Milestone 1, and any difference is recorded here.
    *   `[auth.sms]`: `enable_signup = true`, `enable_confirmations = true`, `max_frequency = "30s"`.
    *   `[auth.sms.twilio]`: `enabled = true` with obviously fake, commented values `account_sid = "local-dummy"`, `message_service_sid = "local-dummy"`, `auth_token = "local-dummy-not-a-secret"`. Only `test_otp` numbers are used locally, so nothing is ever sent.
    *   `[auth.sms.test_otp]`: `919000000001` to `919000000005` = `"123456"`.
    *   `[auth.rate_limit]` (local only): `email_sent = 100`, `sms_sent = 100`, `token_verifications = 300`.
    *   `[auth.email.template.confirmation]`, `.magic_link` and `.email_change`: `subject = "Your A-CureXpress code"` and `content_path = "./supabase/templates/<name>.html"`.
    *   Signing keys:
        *   new root script `db:keys`: when `supabase/signing_keys.json` is missing, it runs `supabase gen signing-key --algorithm ES256` into it;
        *   `db:start` runs `db:keys` first;
        *   CI uses the same scripts;
        *   the file must hold a JSON array, checked in Milestone 1.
*   **R2-M11 (limiter windows): FIX.**
    *   `rate_limits` has `key_hash text primary key`, `window_start timestamptz` and `hits int`.
    *   `rate_limit_hit` works atomically with `insert ... on conflict do update`. When the row is missing or `now() >= window_start + window`, it starts a new window at `now()` with `hits = 1`. Otherwise it increments. It returns `hits <= max`.
    *   It is called before every send (IP and destination keys) and before every verify (`verify:<hmac(dest)>`).
    *   A successful **send** resets `verify:<hmac(dest)>` only, never a send key.
    *   A successful verify does not decrement anything.
*   **R2-M12 and R2-M13 (shell, session source, bottom nav): FIX. Replaces item 50's href text.**
    *   A new server component `components/layout/site-shell.tsx` is used by both `(public)/layout.tsx` and `(patient)/layout.tsx`. It contains the emergency bar, `SiteHeader`, footer and bottom nav, plus `AuthProvider`, `HeaderAuth`, `LoginDrawerLazy` and `AuthLinkInterceptor`.
    *   `AuthProvider` fetches `/auth/session` once on mount and holds `{ state, name, avatarUrl, initials }` for `HeaderAuth`, the interceptor and the user menu.
    *   The bottom-nav "Account" href stays `/account`, and its `aria-current` logic and existing test are unchanged.
    *   The interceptor catches clicks on `/login?...` links, and on `/account` and `/appointments`, only when the state is `signed_out`, and opens the panel. A signed-in user, or a state not yet loaded, navigates normally (without JavaScript, `requirePatient` redirects).
    *   New tests: `auth-link-interceptor.test.tsx` and one added case in `mobile-bottom-nav.test.tsx`.
*   **R2-M14 (sync trigger noise): FIX.**
    *   `sync_contacts_from_auth` copies a value and writes `contact.changed` only when the confirmed value changed: `new.email is distinct from old.email` and `new.email_confirmed_at is not null` (the same for phone), and it differs from the stored profile value.
    *   pgTAP: an update that only changes `last_sign_in_at` writes no audit row.
*   **R2-M15 (error keys): FIX. One closed `AUTH_ERROR` list.**
    *   Sign-in keys: `invalid_or_expired`, `too_many_attempts`, `rate_limited`, `captcha_failed`, `network_error`, `method_disabled`, `unavailable`.
    *   Profile keys: `in_use_phone`, `in_use_email`, `in_use_google`, `cancelled`.
    *   `try_again` is dropped.
    *   Mapping:
        *   `otp_expired` → `invalid_or_expired`;
        *   `over_request_rate_limit`, `over_email_send_rate_limit`, `over_sms_send_rate_limit` → `rate_limited`;
        *   `captcha_failed` → `captcha_failed`;
        *   `signup_disabled`, `provider_disabled`, `email_provider_disabled`, `phone_provider_disabled`, `otp_disabled` → `method_disabled`;
        *   a fetch failure → `network_error`;
        *   on Profile only: `phone_exists` → `in_use_phone`, `email_exists` → `in_use_email`, `identity_already_exists` → `in_use_google`, and `access_denied` → `cancelled`;
        *   everything else (`bad_code_verifier`, `flow_state_not_found`, `flow_state_expired`, `session_not_found`, `sms_send_failed`, `user_banned`, `user_not_found`, `validation_failed`, `email_address_invalid`, unknown, and the three "exists" codes on sign-in screens) → `unavailable`.
    *   `too_many_attempts` comes only from the app limiter.
    *   Panel states are `idle`, `sending`, `code_sent`, `verifying`, the sign-in keys above, `needs_finish`, `step_up` and `success`.
*   **R2-M16 (identity tests placement): FIX.** The T1 to T9 table is normative over item 55. Where each test lives:
    *   **T1, T2:** `app/auth/callback/route.test.ts` checks callback routing and the gate only. The manual checklist in `docs/AUTH.md` proves "one account".
    *   **T3 to T6:** `e2e-auth/profile-contacts.spec.ts`.
    *   **T7:** manual checklist only.
    *   **T8:** `e2e-auth/profile-contacts.spec.ts` (CUJ 9) and `actions.test.ts`.
    *   **T9:** `actions.test.ts` (new and existing destinations give identical results), `rate-limit.test.ts`, and the limiter pgTAP in `01_foundation.test.sql`.
*   **R2-M17 (verification plan and prerender check): FIX. This replaces the "Verification Plan" section above.**
    *   **Database:** `pnpm db:start` (runs `db:keys`), `pnpm db:reset`, `pnpm db:test`, `pnpm supabase db lint`, `pnpm db:types` (local).
    *   **Static and unit:** `pnpm lint`, `pnpm typecheck`, `pnpm test`.
    *   **Build:** `rm -rf apps/web/.next && pnpm build`, then `pnpm --filter @acurexpress/web test:prerender`. This is a plain Node script, `apps/web/scripts/check-prerender.mjs`, not a Vitest file. It reads `apps/web/.next/prerender-manifest.json` and asserts `/en` and `/hi`. CI runs it as its own step after the build. It replaces R1-M23.
    *   **E2E:** `pnpm test:e2e` (unchanged, no Supabase), then `pnpm --filter @acurexpress/web test:e2e:auth` (local stack, `.next-auth`).
    *   **Manual:** the screenshots and the Google checklist as before.
    *   **Coverage:** not enforced (R1-M26; see Known gaps).
    *   **Drift:** R1-M28.
*   **R2-M18 (kill switch leaks existence): FIX.**
    *   Send actions treat `signup_disabled` and `user_not_found` exactly like success: they return `code_sent`, and no code arrives. The later verify fails with `invalid_or_expired`.
    *   `sendStepUpEmailOtp` uses `shouldCreateUser: false` and follows the same rule.
    *   Enumeration test in `actions.test.ts`: with sign-up disabled, a new and an existing destination give identical results.
*   **R2-M19 (consent semantics): FIX.**
    *   `has_current_terms` is true when a granted `terms_privacy` row exists at the current `legal_versions` version. Only `finish_signup` writes Terms rows, always with `granted = true`.
    *   **`finish_signup` on a repeat call** (current Terms already present): it writes nothing, returns, and adds no audit row.
    *   **`finish_signup` after a version change** (profile exists, no current Terms):
        *   it updates `full_name`;
        *   the role insert does nothing on conflict;
        *   it inserts one new Terms row and one marketing row (`granted = p_marketing`) at the current versions;
        *   it writes the audit rows.
    *   `record_consent(p_granted boolean)` handles **marketing only** (the type parameter is dropped). It inserts a row only when the value differs from the latest marketing row, where the latest row by `created_at` wins.
    *   pgTAP covers each case.
*   **R2-M20 (cookie max age): FIX.** `@supabase/ssr` overwrites `maxAge` after spreading `cookieOptions`. The `setAll` callbacks in `server.ts` and `middleware.ts` therefore set `maxAge` to 30 days (2,592,000 seconds) whenever the library's value is greater than 0, and leave removals alone. Tested in `cookies.test.ts`.
*   **R2-M21 (signing key needed before every CLI command): FIX.**
    *   `db:start` runs `db:keys` first, and every other `db:*` command needs a running stack, so a fresh clone works.
    *   `docs/AUTH.md` and the CLAUDE.md command notes say so.
    *   CI uses `pnpm db:start`.
    *   The round-1 "if CLI 3.2 lacks this command" fallback is removed (the command exists).
*   **R2-M22 (expired codes, SMS expiry): FIX.**
    *   "Expired" is covered by action tests with a mocked `otp_expired`.
    *   The e2e suites cover the wrong code and the T8 race only.
    *   The SMS code-expiry key is looked up in CLI 3.2 in Milestone 1. If it exists, it is set to 600 s; if not, the GoTrue default is recorded under deviations.
    *   The verify-attempt window stays 600 s.

### Nits

*   **R2-N1:** round-1 ids are written `R1-…` and the milestones are spelled out in full (see Precedence).
*   **R2-N2:** R1-B2 now reads "no auth specs are added to `e2e/`". The R1-M2 and R1-M25 edits to `e2e/` stand.
*   **R2-N3:** the cron route calls `unconfirmed_users_older_than('24 hours')`, deletes each user with `auth.admin.deleteUser`, then calls `rate_limits_cleanup()`. Nothing else is deleted. Test: `app/api/cron/auth-cleanup/route.test.ts`.
*   **R2-N4:**
    *   The turbo task `test:e2e:auth` has `cache: false` and the same `passThroughEnv` as `test:e2e`.
    *   The CI `e2e-auth` job runs, in order: `pnpm db:start`, `pnpm db:reset`, `apps/web/scripts/auth-e2e-env.sh`, `playwright install chromium`, `pnpm --filter @acurexpress/web test:e2e:auth`.
    *   `proxy.test.ts` and the route tests start with `// @vitest-environment node`.
*   **R2-N5:** the stale round-2 sentence is updated. `docs/specs/auth-implementation-handoff.md` is a working artefact in `docs/specs/` and is kept until the owner says otherwise.
*   **R2-N6:** `step` takes the closed set `finish` | `step_up`, mapping to the states `needs_finish` | `step_up`.
*   **R2-N7:** R1-N7 is an action, not a fact: Milestone 1 **adds** `signing_keys.json` to `supabase/.gitignore`. `supabase/.env` is already ignored by the root `.gitignore`.
*   **R2-N8:** coverage is moved to Known gaps (below).
*   **R2-N9 (`--local` deprecated):** CLI 3.2 treats local as the default for `gen types`, and `--local` only warns. The owner asked for an explicit `--local`, so it is kept and the warning accepted.
*   **R2-N10:** `manual_linking_disabled` maps to `unavailable` for `connectGoogle`. The duplicate `over_request_rate_limit` entry is removed.
*   **R2-N11:** `auth-e2e-env.sh` runs `pnpm -w exec supabase status -o env` from the repo root and strips quotes from the values.
*   **R2-N12:** the sitemap builds its list from `STUB_PAGES`. When a stub is removed, the real page is added to the sitemap list in the same milestone, and `site-footer.test.tsx` and the `StubKey` union are updated with it.
*   **R2-N13 (wording, sample-only nits):** the remaining wording findings in the synthesizer report (vague phrases, "free" and "taken", the item 63 wording, RL-N4 phrasing, confirmed claims) are noted. Where a later entry above restates the rule, that entry is the one that counts.

### Final file list by milestone (supersedes item placement in items 1–66 and R1-M1)

C = create, M = modify. Paths under `apps/web/src` are written `web/…`. Each test file sits next to its source.

| Milestone | Files |
|---|---|
| **1 Database** | M `supabase/config.toml`; M `supabase/.gitignore`; C `supabase/.env.example`; C `supabase/templates/{confirmation,magic_link,email_change}.html`; C `supabase/migrations/<ts>_foundation.sql`, `<ts>_identity.sql`; C `supabase/tests/01_foundation.test.sql`, `02_identity.test.sql`; M `supabase/seed.sql` (comment); M root `package.json` (`db:types --local`, `db:keys`, `db:start`); C `packages/db/src/database.types.ts` (generated) |
| **2 Packages** | C `packages/core/src/{phone,email,next-path,auth-methods,auth-errors,auth-schemas,legal}.ts` + tests; M `packages/core/src/index.ts`; C `packages/db/src/{cookies,admin}.ts` + tests; M `packages/db/src/{server,middleware,env,client,index}.ts` (+ `middleware.test.ts`, `env.test.ts`); M `packages/db/package.json` (`./admin`); C `packages/ui/src/components/sheet.tsx` + test; M `packages/ui/src/index.ts` |
| **3 Proxy and session** | M `web/proxy.ts`; C `web/proxy.test.ts`; C `web/lib/site-url.ts` + test; C `web/config/env-check.ts` + test; M `apps/web/next.config.ts` (env check, `distDir`); M `apps/web/e2e/home.spec.ts` (locale redirects); M root `.gitignore` if `.next-auth` is not covered |
| **4 Sign-in panel** | C `web/features/auth/server/{auth-state,rate-limit,require-patient}.ts` + tests; C `web/features/auth/actions.ts` + test (`sendPhoneOtp`, `sendEmailOtp`, `verifyOtp`, `finishSignup`, `completeStepUp`, `sendStepUpEmailOtp`, `signOut`); C `web/config/auth-methods.ts` + test; C `web/lib/log.ts` + test; C `web/app/auth/session/route.ts` + test; C `web/features/auth/components/{auth-provider,login-drawer,login-drawer-lazy,login-panel,step-header,phone-step,email-step,otp-step,finish-signup-step,step-up-step,turnstile-widget,user-menu,header-auth,auth-link-interceptor}.tsx`; C tests `{phone-step,otp-step,finish-signup-step,step-up-step,login-panel,user-menu,header-auth,auth-link-interceptor}.test.tsx`; C `web/components/layout/site-shell.tsx`; M `web/app/[locale]/(public)/layout.tsx`; M `web/components/layout/site-header.tsx`; M `web/components/layout/mobile-bottom-nav.test.tsx`; M `web/app/[locale]/layout.tsx` (`auth` namespace); M `web/i18n/messages/{en,hi}.json`; C `web/app/[locale]/(public)/login/page.tsx` + test; M `web/config/stub-pages.ts` (remove `login` only) |
| **5 Google** | M `web/features/auth/actions.ts` (`startGoogle`); C `web/features/auth/components/google-button.tsx` + test; C `web/app/auth/callback/route.ts` + test |
| **6 Profile** | M `web/app/[locale]/(patient)/layout.tsx` (uses `SiteShell`); C `web/app/[locale]/(patient)/{appointments,account}/page.tsx`; C `web/features/auth/components/contact-actions.tsx` + test; M `web/features/auth/actions.ts` (`addPhone`, `verifyAddPhone`, `addEmail`, `verifyAddEmail`, `connectGoogle`, `setMarketing`); M `web/config/stub-pages.ts` (remove `appointments`, `account`); M `web/config/footer-links.test.ts`, `apps/web/e2e/{patient-only,footer,home}.spec.ts` (R1-M25) |
| **7 Wrap-up** | C `web/app/api/cron/auth-cleanup/route.ts` + test; C `apps/web/vercel.json`; C `apps/web/playwright.auth.config.ts`; C `apps/web/e2e-auth/{helpers.ts,email-otp,phone-otp,gate,profile-contacts,redirects,a11y}.spec.ts`; C `apps/web/scripts/{auth-e2e-env.sh,check-prerender.mjs}`; M `apps/web/package.json` (`test:e2e:auth`, `test:prerender`); M `.github/workflows/ci.yml`; M `turbo.json`; M `.env.example`, `apps/web/.env.example`; C `docs/AUTH.md`, `docs/rls-matrix.md`; M `docs/SUPABASE.md` (one rule), `CLAUDE.md`; M `docs/specs/auth.md` (status, deviations) |

No dependency is added. Working artefacts (`concepts_brief.md`, `design_draft.md`, both review reports, the handoff) are deleted only on the owner's go-ahead.

### Build decisions and deviations (recorded during the build)

*   **OQ7 result and step-up amendment (owner decision, 2026-11-23, Milestone 1).**
    *   **Local test result:** GoTrue never updates `auth.identities.last_sign_in_at` after the identity is created (it is set at the first code send). `auth.mfa_amr_claims` records `otp` for both phone and email codes. Only Google sessions are identifiable (`oauth`). Condition (a) of R2-B1 could therefore not work.
    *   **Owner chose "server confirms email":**
        *   `complete_step_up()` (authenticated) passes when this session has amr `oauth` and the account has a Google identity, or under condition (b), phone-only.
        *   New `complete_step_up_server(p_user_id, p_session_id)` is service_role only. It checks that the session belongs to the user and that the user has a confirmed email. The `verifyOtp` action calls it right after verifying an **email** code, for both a normal stale email sign-in and the step-up second factor.
        *   A phone sign-in made outside the app stays blocked.
    *   **Permitted uses of the admin client become four:** the rate limiter, the cleanup job, the `unconfirmed_users_older_than` read, and `complete_step_up_server`.
*   **Sticky step-up per session (found while writing the tests).**
    *   **Gap:** R2-B1 still let an attacker's stale session pass once the real owner passed elsewhere, because `last_seen_at` became fresh.
    *   **Fix:** `profiles.step_up_pending_sessions uuid[]`. `touch_last_seen()` adds the current session when it is stale (or already pending), prunes ids of sessions that no longer exist, and leaves `last_seen_at` unchanged. `needs_step_up` is true while the session is pending or stale. Passing removes only that session.
    *   **Gate order:** `authState()` calls `touch_last_seen()` **first**, then `my_auth_state()`.
    *   **Residual (accepted):** a session created directly against GoTrue that never reaches the app before the owner returns is not recorded as pending. Such a session only has row-level access to its own profile rows.
*   **`has_role()` moved to the identity migration,** because it reads `user_roles`, which that migration creates.
*   **Signing key script:** `scripts/db-keys.mjs` (root) wraps `supabase gen signing-key`, which prints a single JWK, into the JSON array that `signing_keys_path` expects. It runs the CLI from a temporary folder, because the CLI fails to load `config.toml` while the key file is missing.
*   **Extra files not in the file table:**
    *   `features/auth/components/panel-ui.tsx` (shared error notice and submit button);
    *   `features/auth/components/login-page-panel.tsx` (the `/login` client wrapper);
    *   `features/auth/server/method-cookie.ts` (shared by the actions and the callback);
    *   root `scripts/db-keys.mjs`;
    *   `apps/web/scripts/check-prerender.mjs`.
*   **Link interception in the capture phase:** Next's `<Link>` handles clicks before a bubbling document listener, so `auth-link-interceptor.tsx` listens in the capture phase and stops the event. Found by the auth e2e suite.
*   **`data-auth-ready` on the header Login link** once the session state has loaded. The e2e suite waits for it; before hydration, a click follows the real `/login` link (the no-JavaScript path).
*   **Step-up e2e not built:** backdating `last_seen_at` needs a direct local DB connection. Step-up is covered by pgTAP and unit tests (Known gaps, `docs/AUTH.md`).
*   **`unconfirmed_users_older_than` also skips users who already have a profile,** as a safety net.
*   **`profiles.full_name` is `not null`:** profiles exist only after Finish sign-up, which always sets a name.

### Known gaps (accepted)

*   Coverage thresholds are not enforced until the owner approves `@vitest/coverage-v8` (R1-M26).
*   T1, T2 and T7 ("one account" with Google) are proven only by the manual checklist.
*   OQ1 (per-IP counting of server calls on hosted Supabase) can only be checked on staging.
*   The Profile add-email and connect-Google verifier clash (R2-M1) is accepted.
*   OQ7 was checked in Milestone 1. It failed, and the owner chose server confirmation (see "Build decisions").

--------------------------------------------------------------------------------

*Drafted with EGM*
