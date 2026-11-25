# Signed-in patient experience: family profiles, dual-state home and security layer (apps/web)

*   **Author:** Ahmad102938
*   **Status:** Approved by the owner (2026-11-24) and built. EGM Stage 9: 5 rounds, accepted at cap; residual Nits in `.egm/signed-in-home/` reports. Step 0 results are recorded in the Detailed Implementation Plan.
*   **Date:** 2026-11-24
*   **Predecessor:** `concepts_brief.md` (EGM brainstorm, seven-lens Goldfish review, author decisions)

--------------------------------------------------------------------------------

## Overview

A patient who signs in to acurexpress.com today sees the same visitor home page as everyone else,
plus two placeholder pages (`/account`, `/appointments`). This design adds the signed-in side of the
web app in four parts. They live in one spec and ship in one build, but each part is written so it
can be reviewed and rolled back on its own:

| Part | What it adds | Schema change |
|---|---|---|
| **A. Web security** | Security headers, two-level CSP, cache rules, noindex, hardened `next=` redirects, Back-after-logout protection, idle sign-out | No |
| **B. Patient profiles** | One login holds many patient profiles (self, children, parents). `/profile` (one person's data and addresses) and `/account` (the login's settings and family list). A profile switcher | Yes (additive) |
| **C. Account security** | Recent-sign-in check (`requireRecentAuth`) and a re-verify dialog for change phone, change email, sign out everywhere and delete-account request. Audit for each | Yes (additive) |
| **D. Patient home** | "/" shows a signed-in home at the same URL, built from independent sections against a typed data contract. Private routes `/appointments`, `/appointments/[id]`, `/support` | No |

### Words used in this document

| Term | Meaning |
|---|---|
| **Account** | The login: one Supabase auth user plus its existing `profiles` row. It holds sign-in methods, consents and security settings. |
| **Patient profile** | One person who can receive care (a row in the new `patient_profiles` table). Every future booking, record, prescription, order and AI chat will point at a patient profile, never at an account. |
| **Self profile** | The patient profile of the account holder. Every patient account has exactly one. It can never be archived. |
| **Dependent** | Any other patient profile on the account: a child, parent, spouse, sibling, grandparent or other relative. |
| **Access grant** | A row in the new `profile_access` table saying "this account may act for this patient profile, with this relationship, from this date". Today every profile has exactly one grant: its owner's. |
| **Selected profile** | The patient profile the screens currently show. Stored as a UI preference only; it never decides who an action is for. |
| **Archive** | Hide a dependent from the switcher and from booking while keeping all its data. It can be restored during the retention period. Nothing is deleted. |
| **90-day step-up** | The existing check (built with sign-in) that asks "Is this your account?" after 90 idle days. Unchanged. |
| **Recent sign-in** | The new check: the user proved who they are within the last 15 minutes. Needed before sensitive account changes. |

## The Problem

1. **No signed-in experience.** A returning patient lands on a marketing home page with carousels and a
   trust strip. They have nowhere that shows "what is happening with me now" (Product Context §25).
   `/account` mixes personal data and login settings. There is no `/profile` and no `/support`.
2. **Families cannot be represented.** In tier-2 and tier-3 cities, one adult often books for a child,
   a spouse or an elderly parent. Today one login is one person (`profiles.id = auth.users.id`).
   Every module we build next (booking, records, prescriptions, orders) would have to be rebuilt if it
   keyed on the login instead of on the person. Fixing this later means migrating every health table;
   fixing it now costs two new tables.
3. **No browser security layer.** `apps/web` sends no CSP, HSTS, frame, referrer or permissions
   headers. Signed-in pages have no `no-store` rule, so a shared phone's Back button or a cache could
   show private data after sign-out.
4. **Sensitive actions need no fresh proof.** Anyone holding an unlocked, signed-in phone can add a
   phone number or email to the account today. Once change-contact, sign out everywhere and delete
   account exist, that becomes account takeover.

## Goals

**Part A: web security**
*   Every response from `apps/web` carries HSTS, `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera,
    microphone, geolocation (except self, for the existing "Deliver to" feature), payment and USB,
    and `frame-ancestors 'none'`.
*   A Content-Security-Policy on every page. The mechanism is chosen by a time-boxed test (see the
    Technical Plan); the target is no `unsafe-inline` for scripts on private pages.
*   Every signed-in response, and every redirect from a private path, sends
    `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`. The public "/" stays
    prerendered, cacheable and free of user data.
*   After sign-out, pressing Back never shows a private page from the browser's back-forward cache.
*   Signed-out access to a private route still goes to `/login?next=<path>` (unchanged behaviour), with
    `next` sanitised. A record id is never placed in `next`.
*   A client idle timer (default 30 minutes, configurable, TODO_HCQ) warns, then signs out and clears
    client state.

**Part B: patient profiles**
*   Every existing and new patient account gets exactly one permanent self profile, created in the
    same transaction as Finish sign-up, plus a one-time backfill. Partner and admin staff never get one.
*   The account holder can add, edit, archive and restore dependents, choosing a relationship from a
    fixed list. Adding an adult dependent requires an "I have their permission to manage their
    details" confirmation, which is audited.
*   Each patient profile has: full name, date of birth, gender (optional, with "prefer not to say"),
    preferred consultation language, an optional contact number (dependents only, not a login), and
    its own saved addresses. Avatars are initials only.
*   Access to anything keyed on a patient profile is decided in Postgres by one family of helper
    functions. A catalog test fails CI if any table with a `patient_profile_id` column lacks RLS or
    a policy that uses them.
*   `/profile` shows the selected patient profile. `/account` shows the login: sign-in methods,
    security, consent settings, family profiles, and (hidden until the payments module exists)
    payments and transactions.
*   A profile switcher in the header and a "Booking for" control appear only when the account has more
    than one non-archived profile. Every action that changes data takes the patient profile id as an
    explicit argument.

**Part C: account security**
*   `requireRecentAuth()` (window: the `app_settings` row `recent_auth_minutes`, default 15, TODO_HCQ) protects change phone, change email, sign out
    everywhere and the delete-account request, on the server and again inside the database
    function where one exists.
*   A re-verify dialog proves the user again with their own method: a code to the account's own phone
    or email, or Google with a forced login screen. The returning user must be the same user, or the
    step fails and signs out. The session it replaces is revoked.
*   Sign out (this device) and sign out everywhere both work. Afterwards, private routes redirect and
    no private data remains in client memory or browser storage.
*   Profile, contact, consent, family-profile and sign-out-everywhere changes are written to the
    append-only `audit_log`, with no names, dates of birth, relationships or contact values in it.
*   Add-phone, add-email, re-verify and code resend are rate limited.
*   A signed-URL helper (60-second expiry) exists with a test, for future private files. No bucket
    is created.

**Part D: patient home**
*   "/" shows the signed-in home for a valid session and the public home otherwise, at the same URL.
    The session cookie only selects which one to try. The signed-in page checks the user itself.
*   The home is built from independent sections in a fixed order: Up next, Needs your attention,
    Quick actions, Continue where you left off, Your doctors, Near you, AI consultant card (flag),
    emergency line. Each section streams on its own, with a fixed-height skeleton and its own error
    boundary. A section with no data is hidden, except Up next, which shows "Book a visit".
*   A brand-new account sees: greeting, Up next "Book a visit", Quick actions, Near you, and a
    dismissible "Complete your profile" card.
*   Home data comes through a typed `PatientHomeData` contract. Where a table exists it returns real
    data. Otherwise it returns empty. A dev-only fixture provider shows the full home for design
    review and cannot be turned on in a production build. A test proves that.
*   Private routes `/appointments` (Upcoming, Past, Cancelled tabs), `/appointments/[id]` and
    `/support` exist, guarded on the server. A record the user cannot access returns 404.
*   Cards show doctor speciality only. Never condition names, medicines or diagnoses.

## Non-Goals

*   **No booking, payments, records, orders or support-ticket tables.** The home sections, the
    appointment tabs and `/appointments/[id]` are built against the contract and show their empty
    or "not found" states until those modules arrive. The payments section of `/account` stays hidden.
*   **No separate logins for dependents.** Dependents are reached only through the owner's account
    (author decision; see Open Questions for the G8 and D8 conflict).
*   **No ownership transfer, second guardian or "child turns 18" flow.** The `profile_access` table
    makes these possible later without a schema change. No UI or function for them now.
*   **No photo upload and no storage bucket.** No virus-scanning service exists yet.
*   **No health fields** (blood group, allergies, conditions, ABHA). Those wait for the records module
    and D8 consent.
*   **No hard delete and no retention purge.** Archive and delete-account requests only record intent.
*   **No server-side idle timeout.** Supabase session time-boxes and inactivity timeouts are a Pro
    plan setting. This design documents them in `docs/AUTH.md` and does not assume them.
*   **No change to the signed-out redirect** (`/login?next=`) or to the 90-day step-up.
*   **No `/orders` or `/records` pages.** Their nav items stay hidden behind the existing flags.
*   **No edits to `docs/ACureXpress_Product_Context.md`.** New decisions and the change-log entry are
    proposals in the final report.
*   **No remote environment changes.** Migrations run on the local stack only.

## Open Questions

*   **D22 (proposed, for the project lead and HCQ): shared credentials.** The author decided that
    dependents never get their own login and anyone using them signs in with the owner's credentials.
    This conflicts with G8 ("No shared logins") and strains D8 (records visible only to the patient
    and the treating doctor) for adult dependents. The schema keeps "who the record is about" apart
    from "who may act", so whatever HCQ decides needs no migration. HCQ's advisers must also confirm
    the DPDP Act rules for children's data (verifiable guardian consent) and for adults managed by a
    relative.
*   **Retention period** for archived profiles and delete-account requests (TODO_HCQ, configuration).
*   **Dependent cap** per account (working default 10, configuration, TODO_HCQ).
*   **Relationship list** (working default: self, child, parent, spouse, sibling, grandparent, other).
*   **Step-up window** (15 minutes) and **idle timeout** (30 minutes): TODO_HCQ, configuration.
*   **CSP mechanism:** decided by the test in the Technical Plan, recorded in this spec before build.
*   **Screenshot location (owner check):** CLAUDE.md describes `docs/designs/` as Stitch exports and
    does not list test screenshots among the allowed new `docs/` files. The build writes them to
    `docs/designs/signed-in-home/` unless the owner chooses another folder.
*   **Which sign-in methods count as "recent":** confirmed by a local check of `auth.mfa_amr_claims`
    before build (for example, whether a token refresh or a contact change writes a new entry).

## Critical User Journeys (CUJs)

### CUJ 1: Returning patient opens "/"
*   **Given**: Masum has a valid session cookie and a self profile.
*   **When**: Masum opens `https://acurexpress.com/`.
*   **Then**: The URL stays `/`. The proxy verifies the session token and rewrites to the internal
    signed-in home. The page checks the user again with `getUser()` and shows "Good morning, Masum",
    Up next ("Book a visit"), Quick actions and Near you. The response carries
    `Cache-Control: private, no-store`, the private CSP and `X-Robots-Tag: noindex`. The visitor hero
    carousel and trust strip are absent.

### CUJ 2: Visitor and stale-cookie visitor open "/"
*   **Given**: (a) no Supabase cookie; (b) a cookie whose token fails verification.
*   **When**: Each opens `/`.
*   **Then**: (a) gets the prerendered public home from the cache, with no `Set-Cookie` and no user
    data. (b) The proxy deletes the `sb-*` cookies on the response and serves the same public home.

### CUJ 3: Adding a child and booking context
*   **Given**: Masum is signed in with only a self profile.
*   **When**: Masum opens `/account`, chooses Family profiles, then Add, enters "Test Child", a date of
    birth in 2019 and the relationship Child, and saves.
*   **Then**: A patient profile and an owner access grant are created in one database transaction and
    audited (`patient_profile.created`, no name or date in the metadata). The header now shows a
    profile switcher. Choosing "Test Child" makes `/profile` show the child's details and addresses.
    The cookie that remembers the choice is checked on every request.

### CUJ 4: Adding an adult parent
*   **Given**: Masum adds a profile with the relationship Parent and a date of birth that makes them 18
    or older.
*   **When**: Masum saves.
*   **Then**: The form requires the checkbox "I have their permission to manage their details". The
    database function rejects the call without it. The audit row records `adult_permission: true`.

### CUJ 5: Changing the phone number on an old session
*   **Given**: Masum signed in 3 hours ago.
*   **When**: Masum chooses Change phone on `/account`.
*   **Then**: The server returns `reauth_required`. The re-verify dialog sends a code to Masum's
    current phone (masked as `+91 •••••• 4321`). After the code is verified, the old session is
    revoked and the change-phone step continues. If the code is wrong 5 times, the dialog shows the
    rate-limit message.

### CUJ 6: Sign out everywhere and Back button
*   **Given**: Masum is signed in on a laptop and a phone, and verified within 15 minutes.
*   **When**: Masum chooses Sign out everywhere on the phone, then presses Back.
*   **Then**: The audit row `session.sign_out_all` is written. Every refresh token is revoked. The phone
    lands on `/` (public home). Back shows no private page: the `pageshow` guard sees a restored
    page, checks `/auth/session`, and replaces the location with `/`. The laptop's next request to a
    private page fails `getUser()` and goes to sign-in.

### CUJ 7: Another user's appointment
*   **Given**: User A is signed in. User B owns appointment `X`.
*   **When**: A opens `/appointments/X`.
*   **Then**: The not-found page (with noindex), the same response as an id that does not exist. No 403, and no hint that `X` exists. Under `cacheComponents` the HTTP status is 200, because the check runs after streaming starts. That is a known gap.

### CUJ 8: A home section fails
*   **Given**: The "Your doctors" loader throws.
*   **When**: The home renders.
*   **Then**: That section alone shows "This section could not load" with a Try again button. Every
    other section renders normally. No layout shift happens when the fallback appears, because it
    replaces a skeleton of the same height.

## Technical Plan (Architecture)

### Request flow

```text
 Browser ──► proxy.ts ─────────────────────────────────────────────────────────────────────────┐
             1. /auth/* skip intl; others: next-intl (may redirect → return as is)            │
             2. updateSessionWithClaims(): no sb-* cookie → "none" (no Supabase call)          │
                                           getClaims ok  → "valid" (+ refreshed cookies)       │
                                           4xx / bad JWT → "invalid" → delete sb-* cookies     │
                                                           (keeps *-code-verifier)             │
                                           network/5xx   → "unknown" (keep cookies)            │
             3. routeClass(pathname): public | private | home | auth                           │
             4. home + "valid"/"unknown" → rewrite to /{locale}/home (URL stays "/")           │
                direct /home → 307 to "/"; /hi/home → 307 to "/hi"                             │
             5. headers: private/home(valid) → no-store, noindex, private CSP (nonce if used)   │
                          public            → public CSP (static headers from next.config)     │
 ◄────────────────────────────────────────────────────────────────────────────────────────────┘
             page (Server Component, inside <Suspense>):
               requirePatient() → getUser()  (the real check; RLS does the enforcing)
               home: on any non-signed-in state renders the public home content instead
```

The proxy never decides access. It only chooses which page to try and which headers to send.
`getClaims()` verifies the token's signature locally and cannot see a global sign-out, so the page
always calls `getUser()`, which asks Supabase Auth.

### Part A: web security

**Route classes.** One pure function, `routeClass(pathname, locales)` in
`apps/web/src/security/route-class.ts`, returns `public`, `private`, `home` or `auth` after
removing the `/hi` prefix (the proxy matcher already skips `/api/*`). `private` = `/appointments`, `/appointments/*`, `/profile`, `/account`,
`/support`, `/home`. `home` = `/`. The proxy, the header tests and the e2e header checks all read this
one list.

**Static headers** come from `headers()` in `next.config.ts` for every path: HSTS
(`max-age=63072000; includeSubDomains; preload`, sent only when deployed), `nosniff`,
`Referrer-Policy`, `Permissions-Policy` (`camera=(), microphone=(), geolocation=(self), payment=(),
usb=()`), `X-Frame-Options: DENY` (for old browsers) and the public CSP. The proxy overwrites the CSP
for private and signed-in-home responses.

**CSP: a time-boxed test decides the mechanism (half a day, before building Part A).** The
repo's own Next 16.4.6 docs (`content-security-policy.md:385-397`) say nonces need dynamic rendering
and do not work with partial prerendering, which `cacheComponents` turns on for every route. They
offer experimental SRI hashes instead. SRI hashes *script files*. The test checks whether it also
covers Next's *inline* page-data scripts (`self.__next_f.push`). If it does not, SRI alone cannot
remove `unsafe-inline`. The test builds the app with `experimental.sri` under Turbopack, loads a
public page and a private page under `script-src 'self'` plus hashes, and records violations.

| Result | Private routes and signed-in home | Public pages |
|---|---|---|
| **R1: SRI covers all scripts** | `script-src 'self' 'strict-dynamic'` + hashes, no `unsafe-inline` | Same strict policy |
| **R2: SRI fails, dynamic works** | Each private page awaits `connection()` above its content so it is fully dynamic. The proxy creates a nonce per request, puts it in the request's CSP header, and Next stamps it on its scripts. `script-src 'nonce-…' 'strict-dynamic'` | `script-src 'self' 'unsafe-inline'` (author-approved) |
| **R3: neither works** | The R2 strict policy ships as `Content-Security-Policy-Report-Only`, with `script-src 'self' 'unsafe-inline'` enforced | Same as R2 |

The test result is written into this spec before Part A is built.

Rules for every result:
*   `InlineScript` (`components/ui/inline-script.tsx`, used by `SiteShell`) reads the nonce from a
    server prop when one exists. Under R1 its content hash is added to the policy. A unit test fails
    if the emergency-bar script would be blocked.
*   Turnstile is the only third-party script. `script-src` and `frame-src` allow
    `https://challenges.cloudflare.com` only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. This is a
    documented exception to "no third-party scripts in (patient)". The captcha protects sign-in and
    re-verify.
*   Full directive list (both levels; only `script-src` differs): `default-src 'self'`;
    `script-src` per level; `style-src 'self' 'unsafe-inline'` (React style attributes and Radix
    positioning need it; styles cannot run script); `font-src 'self'`; `img-src 'self' data: blob:`
    (initials avatars only, so no Google avatar host, and the header stops rendering
    `avatarUrl`); `connect-src 'self' <NEXT_PUBLIC_SUPABASE_URL>`; `frame-src` (Turnstile only);
    `form-action 'self' <supabase URL> https://accounts.google.com`; `object-src 'none'`;
    `base-uri 'self'`; `frame-ancestors 'none'`; `report-uri /api/csp-report`; `report-to csp`;
    `upgrade-insecure-requests` when deployed. A `Reporting-Endpoints: csp="/api/csp-report"`
    header goes with it. Development adds `'unsafe-eval'` (React needs it, per the Next docs).
*   Under R1 the hashes of our own inline scripts are computed in `csp.ts` from the same exported
    source strings `InlineScript` renders. Under R3 the strict policy is sent as
    `Content-Security-Policy-Report-Only` next to the enforced weaker one.
*   A first-party report endpoint, `app/api/csp-report/route.ts`, accepts reports (size-capped, rate
    limited per IP) and logs only the violated directive and the blocked origin. Never the page URL
    or query string.
*   `buildCsp({ level, nonce?, hashes?, env })` in `security/csp.ts` is a pure function with unit
    tests for each level.

**Cache and noindex.** For `private` paths and the rewritten home, the proxy sets
`Cache-Control: private, no-store, max-age=0` and `X-Robots-Tag: noindex, nofollow` on its
response. That includes a `requirePatient` redirect, which happens after streaming has started and
cannot set headers itself. `robots.ts` disallows the private paths. Today's `generateMetadata`
`robots: noindex` stays.

**Signed-out redirect hardening.** `loginHref()` keeps its behaviour. A new `safeReturnPath()` in
`packages/core/src/next-path.ts` runs `sanitizeNextPath` and then turns any path with a UUID segment
into its parent list (`/appointments/<uuid>` becomes `/appointments`). Every caller of `loginHref`,
the OAuth callback and `/login` use it.

**Back after sign-out.** `no-store` stops most browsers from putting the page in the back-forward
cache. Recent Chrome versions may still restore such pages, so there is a second guard.
`PrivatePageGuard` (client, mounted by the `(patient)` layout and the home) listens for `pageshow`.
When `event.persisted` is true, it fetches `/auth/session` with `cache: "no-store"`. If the result is
signed out, or a different user, it hides the page at once and calls `location.replace("/")`. It also
listens on a `BroadcastChannel("acx-auth")`. Sign-out in one tab posts `signed_out`, and every other
tab replaces itself with `/`.

**Idle sign-out.** `features/session/idle-timer.ts` is a pure state machine
(`active → warning → expired`) with an injected clock. Its inputs are pointer, key, scroll and
visibility events, throttled to one per 30 s. `IdleGuard` (client) shows a dialog
`min(2 minutes, timeout / 4)` before expiry ("You will be signed out soon", Stay signed in or Sign
out, `role="alertdialog"`). On expiry it runs the client sign-out sequence (`useSignOut`, below). The timeout
comes from `SESSION_IDLE_MINUTES` (default 30, TODO_HCQ), read on the server and passed as a prop.
Activity in one tab resets the others through the same `BroadcastChannel`. The guard does not run
during a video call or payment (none exist yet; the guard takes a `paused` prop for later).

**Clearing client state** (`features/session/clear-client-state.ts`), used by sign-out, sign out
everywhere and idle expiry. It:
*   removes every `localStorage` and `sessionStorage` key with the `acx:` prefix (recent searches,
    recently viewed doctors, dismissed cards);
*   keeps the device-only delivery location, which is not tied to the user (as today);
*   posts on the broadcast channel;
*   is followed by `location.replace("/")`, a full document navigation, so React's client router
    cache is discarded. Server actions cannot do this (their `redirect()` is a client-router
    navigation), so sign-out is client-driven: `useSignOut()` awaits
    `signOutAction(): Promise<{ ok: boolean }>` (scope local), then `clearClientState()`, then
    `location.replace("/")`. The existing `signOut()` (redirecting) stays for forms without
    JavaScript.

The app has no query library, so there is no other client cache to clear.

### Part B: patient profiles

**Tables** (new migrations; `profiles` is untouched apart from one sync trigger):

```text
auth.users 1 ── 1 profiles                (the ACCOUNT: login, interface language, step-up state)
auth.users 1 ── n profile_access n ── 1 patient_profiles 1 ── n patient_addresses
                  (account_id, patient_profile_id,       (the PERSON: name, DOB, gender,
                   relationship, role='owner',            consultation language, contact,
                   granted_at, revoked_at)                archived_at)
future: bookings, records, prescriptions, orders, ai_conversations ── patient_profile_id
```

*   `patient_profiles`: `id uuid pk`, `full_name` (2–80, trimmed), `date_of_birth date null`
    (required for dependents by the function, on or after 1900-01-01, not in the future),
    `gender profile_gender null`, `consultation_language text null` (`en` or `hi`),
    `contact_phone text null` (E.164, dependents only, never used for sign-in), `archived_at`,
    `archived_by uuid` (no FK), `created_by uuid` (no FK), `created_at`, `updated_at`.
*   `profile_access`: `id`, `account_id uuid → auth.users on delete restrict`,
    `patient_profile_id → patient_profiles on delete restrict`, `relationship profile_relationship`,
    `role profile_access_role` (only `owner` now), `granted_at`, `revoked_at`, `created_at`, `updated_at`.
    Partial unique indexes enforce one active owner per profile (`patient_profile_id where role =
    'owner' and revoked_at is null`) and one self profile per account (`account_id where relationship
    = 'self' and revoked_at is null`). Index `(account_id) where revoked_at is null`.
*   `patient_addresses`: `id`, `patient_profile_id → patient_profiles on delete restrict`, `label`
    (Home, Work, Other, or a free label up to 30 characters), `line1`, `line2`, `landmark`, `city`,
    `state`, `pincode` (`^[1-9][0-9]{5}$`), `latitude`/`longitude` (optional, both or neither),
    `is_default boolean` (a partial unique index allows one default per profile), timestamps.
*   **Why `on delete restrict`:** deleting an auth user who has patient profiles fails instead of
    silently erasing family data, which matches "no hard delete until HCQ sets retention". The
    existing cleanup job only deletes unconfirmed users who never finished sign-up. A pgTAP test
    proves those users have no grants, so the job is unaffected.

**Access helpers** (`SECURITY DEFINER`, `STABLE`, `set search_path = ''`, execute granted to
`authenticated` only):
*   `actable_profile_ids(p_capability profile_capability) returns setof uuid`. It returns the profiles
    the caller (`auth.uid()`) holds an active grant for, filtered by capability:
    *   `read`: includes archived profiles, so the owner can see and restore them.
    *   `manage` and `book`: non-archived only.
    *   `view_records`: the self profile, plus dependents under 18 by date of birth in IST. Adult
        dependents are excluded until D22 says otherwise. Nothing uses this capability yet; it is
        defined now so the records module cannot widen access by accident.
    *   Policies use it as `patient_profile_id in (select public.actable_profile_ids('read'))`. That
        runs once per statement, not once per row.
*   `can_act_for(p_profile uuid, p_capability profile_capability) returns boolean`, for single checks
    inside other definer functions.
*   Neither helper reads a table through RLS, so there is no policy recursion. `profile_access`'s own
    policy is `account_id = (select auth.uid())`, with no helper.
*   Staff, doctor and admin access will be separate helpers OR-ed into future policies. These
    helpers never grant anything to non-patient roles.

**Policies and grants.** `authenticated` gets `select` only on all three tables
(`*_select_actable` / `profile_access_select_own`). All writes go through definer functions, which
validate the input, check `can_act_for`, write the audit row and return the row id:
*   `create_dependent(full_name, date_of_birth, relationship, gender, consultation_language,
    contact_phone, adult_permission boolean)`. It rejects `self`, rejects adults without
    `adult_permission`, and enforces the dependent cap (`app_settings` row
    `max_dependents_per_account`, default 10).
*   `update_patient_profile(id, fields…)`. On the self profile, a name change also updates
    `profiles.full_name` (the header and `my_auth_state` read it).
*   `archive_dependent(id)` and `restore_dependent(id)`. Both reject the self profile.
*   `upsert_patient_address(profile_id, address_id null, fields…)`, `delete_patient_address(id)` and
    `set_default_address(id)`. Addresses are not health data, so deleting one is a real delete, audited.
*   Every function writes `write_audit(auth.uid(), '<subject>.<verb>', '<subject>', id,
    {"fields":[…names only…]})`. Never values.

**Self profile creation.**
*   A new migration replaces `finish_signup(text, boolean, consent_source)` with the same signature
    and the same body, plus an idempotent "insert self profile and owner grant if missing" step in
    the same transaction.
*   The same migration backfills a self profile for every existing `profiles` row that lacks one.
    The backfill copies from `profiles`, never from `auth.users`, so staff accounts never get one.
    It is safe to run twice.
*   A trigger on `profiles` (after update of `full_name`) mirrors the name to the self profile. It is
    guarded by `pg_trigger_depth()` so the two updates do not loop. That keeps today's `/account`
    name update working while the deployed app version still writes `profiles.full_name`.
*   The self profile is the source for person fields. `profiles.full_name` is a mirror kept for the
    deployed code. Dropping it is a later expand-and-contract step, not part of this build.

**Configuration.** A small `app_settings` table (`key text pk`, `int_value int`, `text_value text`,
`is_public boolean not null default false`; `authenticated` may select rows where `is_public`;
written by migrations only) holds `max_dependents_per_account` (10), `profile_retention_days` (null,
TODO_HCQ) and `recent_auth_minutes` (15, TODO_HCQ, public). The only app-side value is the idle
timeout (`SESSION_IDLE_MINUTES`, default 30 in `packages/core`), because the database never checks it.

**Catalog test** (`supabase/tests/05_patient_profile_catalog.test.sql`). It finds every `public`
table with a `patient_profile_id` column and asserts: RLS is enabled; a `select` policy exists and
its expression calls `actable_profile_ids`; no policy references `account_id` directly;
`authenticated` has no insert, update or delete grant on any table with a `patient_profile_id`
column (writes go through definer functions). `profile_access` is exempt by name and has its own
assertion: its only policy is `account_id = (select auth.uid())` and it has no write grants. Every
future module's migration therefore fails CI if it forgets this.

**Selected profile.** The cookie `acx_profile` holds a patient profile id (httpOnly, `secure` when
deployed, `sameSite=lax`, 30 days).
*   It is set only by the `selectProfile(id)` server action, which first checks
    `can_act_for(id, 'manage')`.
*   `getSelectedProfile()` (server, wrapped in `React.cache`) reads the cookie and loads that row
    through RLS. If the row is missing, archived or forged, it returns the self profile with
    `fellBack: true`, and the page shows "We switched you back to your own profile" (en and hi).
*   The cookie never decides the target of a change. Every mutating action takes `patientProfileId`
    as an argument, which the form fills from what it is showing. The database checks it again.
*   Two tabs on different profiles therefore each act on the profile their form shows.

**Switcher UI.** `ProfileSwitcher` (header, desktop) and `BookingForSwitcher` render only when
`profiles.length > 1` (the component exists either way and returns `null` otherwise). Each is a
listbox of initials avatars, first names and relationships, with keyboard support. Choosing an item
calls `selectProfile` and then `router.refresh()`.

**Pages.**
*   `/profile`: the selected person's details form (name, date of birth, gender, consultation
    language, contact number for dependents) and their address list (add, edit, delete, default).
    Initials avatar.
*   `/account`: Sign-in methods (existing contact actions, moved), Security (change phone, change
    email, sign out, sign out everywhere, delete-account request), Consent settings (marketing, plus
    the Terms and Privacy versions shown read-only), Family profiles (list, add, edit, archive,
    restore, with the relationship shown), and Payments and transactions (hidden; no tables).
*   The OAuth link callback keeps returning to `/account?link=google`.

### Part C: account security

**Recent sign-in check.** One source of truth: the database. `requireRecentAuth()` in
`features/auth/server/recent-auth.ts`:
1.  It reads the *verified* claims with `supabase.auth.getClaims()`, never the unverified decode
    `sessionIdFrom` in `actions.ts`.
2.  It then calls `rpc("auth_is_recent")`. That SQL function reads `amr` (a list of
    `{ method, timestamp }`) from `auth.jwt()`, keeps only methods on an allow-list defined inside
    the function, and compares the newest timestamp with `now − window`, where the window is the
    `app_settings` row `recent_auth_minutes`. Exactly `now − window` counts as recent. The allow-list starts as `otp` and `oauth` and
    is confirmed by a local check before build (see Open Questions). The check records which `amr`
    method each event writes: email code, SMS code, Google, token refresh, `email_change`,
    `phone_change`, `linkIdentity`. A method that a contact change or token refresh can produce is
    excluded.
3.  It returns `{ ok: true }` or `{ ok: false, reason: "reauth_required" }`. The rule's cases
    (inside, boundary, expired, empty, disallowed method, future timestamp) are pgTAP tests; the
    server helper has unit tests with a fake client.

The definer functions call the same `public.auth_is_recent()`. `request_account_deletion()` and
`record_sign_out_everywhere()` call it, so going around the server action does not skip the check.
`updateUser` and global sign-out can still be called straight against Supabase Auth with a valid
token. That gap is documented in `docs/AUTH.md`. Turning on Supabase's secure email change
(`double_confirm_changes = true`, already set locally) and a shorter `jwt_expiry` on staging and
production reduces it.

**Protected actions.**
*   `addPhone`/`changePhone` and `addEmail`/`changeEmail` (one action each: "add" when the contact is
    empty, "change" when it is set). The existing flow is kept: `updateUser`, a code to the *new*
    contact, then `verifyOtp` with type `phone_change` or `email_change`. The existing
    `sync_contacts_from_auth` trigger audits `contact.changed`.
*   `signOutEverywhere()`. Sequence: (1) `record_sign_out_everywhere()` (no arguments) checks
    recency and writes one audit row, `session.sign_out_all`, with the current session; (2)
    `auth.signOut({ scope: "global" })`; (3) the action returns `{ ok }` and the client runs
    `clearClientState()` and `location.replace("/")`. No second audit call is possible after (2),
    because no session is left, so success or failure of (2) is recorded in the `auth.sign_out_all`
    log event.
*   `requestAccountDeletion()`. It calls `request_account_deletion()`, which inserts an
    `account_deletion_requests` row (status `requested`, RLS select own) and audits
    `account.deletion_requested`. The action then runs the sign-out-everywhere sequence above
    (which writes `session.sign_out_all`). Nothing is archived or deleted. HCQ support processes the request
    under the retention rule once it exists. `cancel_account_deletion()` lets the user withdraw it
    after signing in again.

**Re-verify dialog** (`features/auth/components/reverify-dialog.tsx`). It opens when an action
returns `reauth_required`, then retries that action on success.
*   **Code path.** The server picks the destination from the signed-in user's *own* confirmed phone
    or email (`getUser()`), never from the browser: the confirmed phone by default, else the email,
    with "Use email instead" when both exist. It shows it masked. It sends the code with
    `shouldCreateUser: false` through the existing sender, with Turnstile when configured, and checks
    the limits `sendPerDestination`, `resendCooldown` and the new `reverifyPerUser` (5 per hour). The
    code is checked with the cookie client's `verifyOtp`.
*   **On success.** Before `verifyOtp` the server reads the current access token with
    `getSession()` (used only as a token, never for identity). `rememberMethod` and the 90-day
    step-up functions do not run on this path. The server compares the new user id with the id
    captured before the check. On a
    mismatch it signs out, logs `auth.reverify` with outcome `mismatch` and fails. It then revokes the
    *replaced* session by calling Supabase Auth's logout endpoint with the old access token and
    `scope=local`. That revokes only that session, with no service role. Other devices stay signed in.
*   **Google path.** It is offered only to accounts with a Google identity. `startGoogle` gets
    `flow=reverify` and `queryParams: { prompt: "select_account", max_age: "0" }`, and sets an
    httpOnly, 10-minute cookie with an HMAC of the expected user id
    (`acx_reverify = <expiry>.<hmac(user id, expiry)>`, keyed with `RATE_LIMIT_HMAC_SECRET` and the
    domain prefix `reverify:`). Before the redirect the dialog stores only the pending action name
    (`change_phone`, `change_email`, `sign_out_all` or `delete_request`, no values) in
    `sessionStorage` key `acx:reverify-pending`; on return with `?reverify=ok` the page reopens that
    flow and the user enters any new contact again. A mismatched Google account can leave a
    confirmed auth user with no profile; that is a known gap for admin cleanup. The callback exchanges the code, compares the
    user id with the cookie (mismatch: sign out, fail closed, log), revokes the replaced session and
    returns to the page.
*   **Google limitation.** Google documents `prompt` values `none`, `consent` and `select_account`,
    not `login`. Whether `max_age=0` forces Google to ask for the password again is checked locally
    before build. If it does not, a Google account re-verifies with an email code to its Google email,
    since every Google account has one. The Google button is then not offered in this dialog.
*   **Copy.** The 90-day step-up says "Is this your account?". This dialog says "Confirm it's you to
    change your phone number" and names the action, so users can tell the two apart.

**Audit actions added:**
*   `patient_profile.created`, `patient_profile.updated`, `patient_profile.archived`,
    `patient_profile.restored`
*   `patient_address.created`, `patient_address.updated`, `patient_address.deleted`
*   `consent.changed` (already exists through `record_consent`)
*   `session.sign_out_all`
*   `account.deletion_requested`, `account.deletion_cancelled`

All rows carry ids, and metadata holds only `fields`, a list of column names, plus
`adult_permission` where it applies.

**Logging.** `lib/log.ts` gains events `auth.reverify`, `auth.sign_out_all`,
`account.deletion_request`, `profile.switch`, `profile.change`, `session.idle_sign_out`,
`home.rewrite` and `csp.report`, with closed outcome lists. Callers pass the `x-request-id` the proxy
now sets. Separately, `authState` stops treating an RPC error as "needs Finish sign-up". It returns
a distinct `unavailable` state, and the page shows a retry message.

**Signed URLs.** `createSignedFileUrl(client, bucket, path)` in `packages/db/src/storage.ts`
(server-only):
*   It accepts only buckets listed in `PRIVATE_BUCKETS` (empty today) and paths shaped
    `<uuid>/<uuid>.<ext>`.
*   It always uses 60 seconds and the caller's own session client, so storage RLS applies.
*   Unit tests use a fake client: an unknown bucket and a bad path are rejected, and the expiry is
    always 60.

### Part D: patient home

**Rewrite.** Covered in the request flow above.
*   The internal page is `app/[locale]/(patient)/home/page.tsx`, so it inherits the patient layout
    and its guards.
*   `rewriteKeepingState()` in `security/rewrite.ts` builds the rewrite from next-intl's response. It
    copies intl's headers and cookies and targets `/{locale}/home`. It does nothing if intl returned
    a redirect.
*   Unit tests cover:
    *   `/`, `/hi` and `/hi/`
    *   a refreshed cookie
    *   chunked `sb-…-auth-token.0/.1` cookies
    *   an invalid token (cookies deleted, no rewrite)
    *   no cookie (no Supabase call, no `Set-Cookie`)
    *   an RSC prefetch request
    *   a direct `/home` request (307 to `/`)

**Page states.** The home page runs `authState()` inside its main `<Suspense>`:
*   `signed_in`: the signed-in home.
*   `needs_finish` or `step_up`: a redirect to `/login?next=/&step=…`, as today.
*   `signed_out` (a token that verified locally but was revoked) or `unavailable`: it renders the
    public home's content component inside the same response, still `no-store`. The proxy keeps
    rewriting until the token expires (at most `jwt_expiry`). After that, verification fails and the
    proxy clears the cookies.

**Section registry** (`features/patient-home/sections.ts`): an ordered list of
`{ id, alwaysShown, Skeleton, Section }`.
*   The page first awaits one `getHomeOutline(ctx)` call (`features/patient-home/outline.ts`),
    which uses cheap existence checks and the pure `sectionsToRender(data, flags, dismissed)` to
    return the server-known sections. "Continue where you left off" is the one client section: its
    data lives only in device storage, so it renders after hydration through
    `useSyncExternalStore` (server snapshot: hidden).
*   Then each present section renders as `<SectionBoundary id>`: a client error boundary wrapping
    `<Suspense fallback={<Skeleton/>}>` around a server component that loads its own data.
*   Skeleton, content and error fallback share a fixed minimum height per section, so server
    sections do not jump. A hidden section never renders a skeleton. The client section can still
    shift what is below it, so the target is CLS below 0.1, not 0.
*   The outline is cached per request with `React.cache`. Budget: one Auth call (`getUser`) and the
    gate's 2 RPCs, plus at most 3 home queries (profile and selected profile, outline, Near you),
    checked by a unit test that counts fake-client calls.

**Data contract** (`features/patient-home/contract.ts`), with types only:
*   `PatientHomeData = { greeting, upNext: UpNext | null, attention: AttentionItem[],
    continue: { unfinishedBooking, recentSearches, recentlyViewedDoctors }, yourDoctors: DoctorRef[],
    nearYou: { doctors, clinics }, completeProfile: { needsPhone, needsAddress } }`.
*   Every type carries ids, display names, speciality, times (UTC ISO) and mode. There is no field
    for conditions, medicines or diagnoses, so a card *cannot* show one.
*   `UpNext.action` is one of `join_call`, `get_directions` or `check_in`, decided by the server from
    the appointment's mode and time.
*   `AttentionItem` `payment_pending` carries `holdExpiresAt` from the server.

**Sources** (`features/patient-home/sources/`):
*   `real.ts` reads what exists today:
    *   the first name from the self profile
    *   `completeProfile` from the account's phone and the selected profile's addresses
    *   Near you from the same doctor and clinic data the public home uses (today the labelled
        SAMPLE data, with its on-screen "Sample data" note, as the public home does)
    *   `recentSearches` and `recentlyViewedDoctors` from `acx:` device storage, read on the client
        only and never sent to the server
    *   everything else: `null` or `[]`
*   `dev-fixtures.ts` holds full fixture data, every name visibly fake ("Dr. Test Sample").
*   `get-source.ts` returns the fixture source only when
    `process.env.NODE_ENV !== "production" && process.env.PATIENT_HOME_FIXTURES === "1"`. The fixture
    module is imported only inside that branch, so production builds drop it (`NODE_ENV` is inlined
    at build time).
*   Three locks:
    1.  `assertProductionEnv()` fails a production build if `PATIENT_HOME_FIXTURES` is set.
    2.  A unit test asserts that `NODE_ENV=production` with the flag set returns the real source.
    3.  A post-build check script fails if the fixture marker string appears in `.next` output.

**Sections:**
*   Greeting: `greetingFor(date, "Asia/Kolkata")`. Morning 05:00–11:59, afternoon 12:00–16:59,
    evening otherwise. First name = the first word of `full_name`.
*   Up next: always shown. With no appointment: a slim "Book a visit" card. Otherwise: doctor name,
    speciality, IST time, mode chip (icon plus text), one action button, plus Reschedule.
*   Needs your attention: payment pending with `SlotHoldTimer`. It counts down from the server's
    `holdExpiresAt` and updates text each minute. Its live region is `aria-live="polite"`, switching
    to `assertive` at 1 minute. Reduced motion is not affected (there is no animation). At expiry it
    shows "Slot released".
*   Quick actions: Book visit, Online consult, Upload prescription (only when the `medicineSales`
    flag is on), My appointments.
*   Continue where you left off; Your doctors (Book follow-up); Near you (doctors and clinics near the
    selected profile's default address, else the device PIN).
*   AI consultant card when `aiConsultant` is on; emergency line (`config/emergency.ts`).
*   Complete your profile: shown when there is no phone or no address. Dismissal is stored in the
    cookie `acx_dismiss_profile_card=1` (no personal data), so the server can hide it without a
    shift. Never a forced form.

**Header (signed in).**
*   It keeps the logo, search, category row and EN/हिन्दी.
*   The address chip shows the selected profile's default address label and PIN, else the existing
    PIN chip.
*   The bell opens a popover with "No notifications yet". No badge.
*   The avatar menu shows the first name and masked contact (`maskPhone`, `maskEmail` in
    `packages/core/src/mask.ts`). Its items: My appointments, Profile, Account, Support, Sign out.
*   Search keeps recent searches in `acx:recent-searches` (last 5, device only, cleared on sign-out).

**Mobile bottom tabs.** Home, Find care (`/doctors`), Appointments, Shops (`shopNetwork`), Account.
Medicines is added only when `medicineSales` is on. The tabs replace today's Doctors and Consult tabs.
This changes §25's mobile tab list ("Home, Doctors, Medicines, Orders, Account"), so it is listed as
a proposal for the project lead. The tabs keep 44 px minimum targets and
`padding-bottom: env(safe-area-inset-bottom)`.

**Private routes.**
*   `/appointments`: tabs Upcoming, Past and Cancelled as links (`?tab=` with a closed set of
    values), each with its empty state.
*   `/appointments/[id]`: the id is validated as a UUID (else 404). It is loaded through RLS once
    bookings exist. Missing or not accessible: `notFound()`. Today it is always `notFound()`.
*   `/support`: contact routes from `config/company.ts`, the emergency notice, and links to
    appointments and account help. No form.

### Rollout and rollback

*   **Parts A and D** are app-only. Rollback is Vercel Instant Rollback.
*   **Parts B and C** add migrations only: four new enums, five new tables (`app_settings`,
    `patient_profiles`, `profile_access`, `patient_addresses`, `account_deletion_requests`), new
    functions, a replaced
    `finish_signup` with the same signature, one trigger and a backfill. No column is dropped or
    renamed. The deployed app (which does not know the new tables) keeps working against the new
    schema. That order is required: migrate, then deploy (`docs/DEPLOYMENT.md`).
*   No remote migration runs from a laptop. Before CI applies this to any remote, the project lead
    confirms which remotes hold the existing two migrations and takes a PITR marker.

## Alternatives Considered

### Alternative A: Four separate specs (web security, patient profiles, account security, patient home)
*   **Pros**: Each spec gets its own review and its own rollback story. It is easier to stop after
    one part.
*   **Cons**: Four EGM cycles before any build. Some decisions span all four parts (route classes,
    selected profile, audit names) and would be repeated or drift between documents.
*   **Reason for Rejection**: Rejected by author: one spec and one build. The spec is ordered by
    part, and each part has its own rollback, so a reviewer can still judge each part on its own.

### Alternative B: `account_id` and `relationship` columns on `patient_profiles` (no access table)
*   **Pros**: One table fewer. Policies are simpler (`account_id = auth.uid()`).
*   **Cons**: "Who the record is about" and "who may act" become the same column. A second guardian,
    a carer, a child turning 18 or a handover to the person's own login would each mean a schema
    change and a rewrite of every policy on every health table.
*   **Reason for Rejection**: Rejected by author after the Goldfish review: `profile_access` costs one
    table now and keeps every later change to "who may act" a data change, not a migration.

### Alternative C: Separate logins for dependents (G8 default)
*   **Pros**: Matches G8 ("No shared logins") and D8. Audit can name the real actor.
*   **Cons**: Children and many elderly parents have no phone or email of their own. Families would
    need several logins to book for each other, which is the main use case.
*   **Reason for Rejection**: Rejected by author: one login per family, with the owner's credentials.
    Raised with HCQ as proposed decision D22. The access table allows separate logins later without a
    migration.

### Alternative D: One boolean helper `can_act_for(id)` used in every policy
*   **Pros**: One function, simple to read.
*   **Cons**: A function taking a row column runs once per row, which is slow on large lists at the
    D20 scale. A yes or no answer cannot tell "may read an archived profile" apart from "may book for
    it" or "may see health records" (D8).
*   **Reason for Rejection**: Rejected by author after review: a set-returning helper with
    capabilities (`read`, `manage`, `book`, `view_records`) runs once per statement and keeps D8
    separate. The boolean form stays for single checks inside functions.

### Alternative E: The selected-profile cookie decides who an action is for
*   **Pros**: Forms do not need a hidden profile id field.
*   **Cons**: Two open tabs on different profiles would book or edit for the wrong person. A silent
    fallback to self after an archive would turn "book for Dad" into "book for Self".
*   **Reason for Rejection**: Rejected by author after review: every change takes the profile id
    explicitly. The cookie only sets what the screens show.

### Alternative F: Strict nonce CSP everywhere, all pages dynamic
*   **Pros**: One strict policy for the whole origin, with no `unsafe-inline` anywhere.
*   **Cons**: Every public page renders per request. That gives up CDN caching (Product Context §24)
    and the decision that the public "/" stays static.
*   **Reason for Rejection**: Rejected by author: two levels, with `unsafe-inline` allowed on public
    pages only if the SRI test (R1) fails.

### Alternative G: Keep "/" public with a small greeting, signed-in home at `/home`
*   **Pros**: No rewrite logic, and no one URL with two different responses. Simpler caching.
*   **Cons**: Patients would have two homes. The request asked for one URL that serves both states.
*   **Reason for Rejection**: Rejected by author: the dual-state "/" was decided before the
    brainstorm. The reviewers' fixes (verify claims in the proxy, clear stale cookies there, no-store
    on the rewrite, `/home` redirects to `/`) remove the risks they raised.

### Alternative H: Send signed-out users to the public home instead of `/login?next=`
*   **Pros**: The redirect never reveals that a path is private.
*   **Cons**: Links from SMS and email reminders lose their destination, and users are not prompted
    to sign in.
*   **Reason for Rejection**: Rejected by author: keep today's behaviour and harden it
    (`safeReturnPath` strips record ids, no-store and noindex on the redirect).

### Alternative I: A server-side `recent_auth` row instead of `amr` timestamps
*   **Pros**: Independent of how Supabase fills `amr`. It can be scoped to a single action.
*   **Cons**: It needs the service role, or a new definer function that trusts the server's word that
    a code was checked. That is one more table and one more trust path.
*   **Reason for Rejection**: Rejected by author for now: `amr` with a method allow-list and a
    same-user check, verified by the local test. It remains the fallback if `amr` turns out to be
    unreliable.

### Alternative J: Server-side idle timeout (a `last_active_at` per session)
*   **Pros**: A real security control, which a client timer is not.
*   **Cons**: A database write on activity for every signed-in user, and it duplicates a Supabase
    Pro setting (session inactivity timeout).
*   **Reason for Rejection**: Rejected by author: the client idle timer plus the documented Supabase
    Pro setting. Revisit when HCQ picks a plan.

### Alternative K: Account-level address book with a default per profile
*   **Pros**: One household address is stored once, not once per family member.
*   **Cons**: A parent in another city would share the list with everyone, and each address would
    still need to say who it belongs to.
*   **Reason for Rejection**: Rejected by author: addresses belong to a profile.

### Alternative L: Photo upload for avatars
*   **Pros**: People recognise a family member faster by photo.
*   **Cons**: It needs a private bucket, signed URLs and an upload-scanning service (§14) that does
    not exist yet.
*   **Reason for Rejection**: Rejected by author: initials only for now.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security and privacy:**
    *   RLS on every new table in the same migration.
    *   No service-role key anywhere in `(patient)`, the home or the new actions.
    *   No health data in audit metadata, logs or analytics. Audit metadata carries field names only.
    *   Masked contacts only on screen.
    *   Opaque UUIDs in URLs; no record ids in `next`.
*   **Performance:**
    *   The public "/" stays prerendered.
    *   A signed-in home render makes one Auth call, the gate's 2 RPCs and at most 3 home queries.
    *   The access helper runs once per statement.
    *   Layout shift: CLS below 0.1, checked in e2e with a `PerformanceObserver` (server sections
        keep fixed heights; only the device-data section can shift).
*   **Accessibility:**
    *   WCAG AA contrast, visible focus, 44 px targets, keyboard order.
    *   `aria-live` slot timer; `role="alertdialog"` for the idle warning and the re-verify dialog.
    *   Reduced motion respected.
    *   axe zero critical and serious at 360 px and 1280 px.
*   **Rollout and rollback:**
    *   Migrate, then deploy.
    *   Migrations are additive, so older deployed apps keep working.
    *   App rollback is Vercel Instant Rollback.
    *   No remote action from a laptop.

### Additional Resources

*   `concepts_brief.md` (brainstorm and the seven-lens Goldfish review)
*   `docs/ACureXpress_Product_Context.md` §§6, 7, 12, 14, 22–26
*   `docs/SUPABASE.md`, `docs/TESTING.md`, `docs/AUTH.md`, `docs/specs/auth.md`, `docs/rls-matrix.md`
*   `apps/web/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`

### Future Improvements

*   **Handover:** a profile handed over to its own login (a revoke plus a grant in `profile_access`)
    once D22 is decided.
*   **Health fields:** health fields on patient profiles with D8 consent, in the records module.
*   **Strict public CSP:** if R1 fails now, revisit when Next's SRI covers inline scripts.
*   **Server-side checks:** a server-side idle timeout and a `recent_auth` row if `amr` proves unreliable.
*   **Data contraction:** contract `profiles.full_name` once no deployed app reads it.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Build order (a suggested sequence, not a set of checkpoints): **Step 0**, then the database items
(1–8, 80), then shared packages (9–18, 81, 76), then apps/web security and session (19–37), then
profiles and account (38–48), then the home and private routes (49–61, 82, 77–79), then the e2e,
screenshot and documentation items (62–75). Items in one group may use items from a later group.
The only rule is that the whole plan passes the Verification Plan before it is reported done. Two
fixed points are checked along the way: after the database items, `pnpm db:reset && pnpm db:test`
is green; and `pnpm db:types` runs after every migration file (items 1, 2 and 3), not only once.
The `/` rewrite in the proxy (item 23) is switched on only after its target page (item 53) exists.
Every item names its tests, or the item whose tests cover it ("Covered by"). Paths are relative to
the repo root.

### Step 0: Local checks (results recorded in this spec before any apps/web item is built)

| Check | How | If it fails |
|---|---|---|
| **CSP** | Build `apps/web` with `experimental.sri` and a strict `script-src` on a scratch copy of the config. Record violations on `/`, `/doctors` and a private page. For R2, confirm a private page that awaits `connection()` builds under `cacheComponents` and receives the nonce. | Choose R2 or R3 as in the Technical Plan. |
| **Request headers** | Confirm a server component reads `x-request-id` and the nonce passed with `NextResponse.next/rewrite({ request: { headers } })` after next-intl has run. | No nonce: use R3. `x-request-id` is then generated inside the server action instead. |
| **`amr`** | On the local stack, sign in by email code, SMS test number and (if configured) Google. Refresh a token, change the email and add a phone. Read `auth.mfa_amr_claims` and the JWT `amr` after each step. The identity migration already records that GoTrue writes `otp` for both code types. | **A token refresh, or a contact-change code, writes a fresh `amr` timestamp:** then `amr` cannot prove a recent sign-in. Someone holding a stolen session could call `updateUser` straight against Supabase Auth, verify a contact they control, and pass the check. In that case the server keeps its own proof instead (the "server proof" fallback):<br>• After `verifyOtp` succeeds in a sign-in or re-verify action, or after a fresh Google sign-in in the callback, the server sets an httpOnly cookie `acx_recent = <session_id>.<expiry>.<hmac>`. The session id comes from `getClaims()`, the expiry is now plus `app_settings.recent_auth_minutes`, and the HMAC is keyed with `RATE_LIMIT_HMAC_SECRET` and the prefix `recent:`.<br>• `requireRecentAuth()` checks the cookie (same session id, not expired, HMAC valid) instead of the RPC.<br>• Files: `recent-auth.ts` (item 44), the verify paths in `actions.ts` (item 45) and `auth/callback/route.ts` (item 46), each with tests for set, expired, other session and bad HMAC.<br>• No database function can see the cookie, so the database checks in `request_account_deletion()` and `record_sign_out_everywhere()` are replaced by a plain signed-in check, and the gap is documented. In this branch item 3 drops `reauth_required` from those two functions, and item 5 replaces its "rejected when not recent" cases with "rejected for an unauthenticated caller" (the recency cases move to the unit tests of item 44).<br>• This replaces the "timestamp from the session claims" rule in the original request, so it is reported to the owner. |
| **Google** | Test whether `prompt=select_account` with `max_age=0` makes Google ask for the password again. | Google accounts re-verify by an email code to their Google email; the Google button is not offered in the dialog. |
| **CSP header** | Confirm the CSP header that the proxy sets is the only one in the response. `next.config.ts` sends no CSP (item 24). | — |
| **Logout** | Confirm `POST /auth/v1/logout?scope=local` with the replaced access token revokes only that session. | Do not revoke. The replaced session ends with its refresh token. Documented as a known gap in `docs/AUTH.md`. |

### Step 0 results (2026-11-24, local stack, Next 16.4.6)

| Check | Result | Decision |
|---|---|---|
| CSP | `experimental.sri` under Turbopack hashed 6 of 14 external scripts and none of the 63 inline scripts on `/` (page data, Turbopack bootstrap, our emergency script). A private page with `export const instant = false` and `await connection()` built as fully dynamic (`ƒ`), and with a request CSP nonce 17 of 18 scripts carried it; the only one missing was our own `InlineScript`. | **R2.** Private routes and the signed-in home use `instant = false` + `connection()` and a per-request nonce with `strict-dynamic`; `InlineScript` takes the nonce. Public pages use `script-src 'self' 'unsafe-inline'`. |
| 404 status | `notFound()` in the blocking spike page still returned HTTP 200. | Known gap as written (item 55). |
| `amr` | Token refresh kept the original timestamp. Verifying a `phone_change` code wrote a **fresh** `otp` timestamp. | **Server proof fallback** (Step 0 table). `requireRecentAuth()` checks the `acx_recent` cookie; the two database functions check only that the caller is signed in. |
| Google | Not configured on the local stack, so `max_age=0` could not be tested. | Google accounts re-verify by an email code; the dialog offers no Google button. |
| Logout | `POST /auth/v1/logout?scope=local` with the replaced token revoked that session only; the new session still refreshed. | Re-verify revokes the replaced session as planned. |
| Request headers, single CSP | Checked by the proxy unit tests and `security-headers.spec.ts` during the build. | — |

### Rules for every apps/web item

*   Under CSP result R2, every `(patient)` page and the home await `connection()` first, so they
    render per request and receive the nonce.
*   Every server action calls a guard before anything else: profile actions use `profileGuard()`
    (signed in, not `needs_finish` or `step_up`). Every action returns a closed error-key union.
*   No `any`. Types for new tables come from `pnpm db:types`.

### Target Files to Create/Modify

#### Database (Parts B and C)

##### 1. `supabase/migrations/<ts>_patient_profile_enums.sql` (Create)
*   **Type / Scope**: SQL migration (created with `pnpm supabase migration new`).
*   **Proposed Changes**: Enums `profile_relationship` (self, child, parent, spouse, sibling,
    grandparent, other), `profile_gender` (female, male, other, prefer_not_to_say),
    `profile_access_role` (owner) and `profile_capability` (read, manage, book, view_records). Kept in
    their own file as one concern per migration (`docs/SUPABASE.md` §7).
*   **Covered by**: items 4 and 6.

##### 2. `supabase/migrations/<ts>_patient_profiles.sql` (Create)
*   **Type / Scope**: SQL migration.
*   **Proposed Changes**:
    *   **Tables:** `app_settings`, `patient_profiles`, `profile_access`, `patient_addresses`, with
        the columns and checks from the Technical Plan.
        *   `profile_access`: plain indexes on `account_id` and `patient_profile_id`, plus partial
            unique indexes for one active owner per profile and one self profile per account.
        *   `patient_addresses`: an index on `patient_profile_id`, plus a partial unique index
            `(patient_profile_id) where is_default`.
        *   Every foreign key uses `on delete restrict`.
        *   `set_updated_at` triggers, and comments marking personal data.
    *   **RLS** is enabled in the same file, with these policies:
        *   `patient_profiles_select_actable` and `patient_addresses_select_actable`, both
            `… in (select public.actable_profile_ids('read'))`;
        *   `profile_access_select_own`: `account_id = (select auth.uid())`;
        *   `app_settings_select_public`: `is_public`.
    *   **Grants:** revoke all from public, anon, authenticated and service_role, then grant `select`
        to authenticated and service_role.
    *   **Helpers** (definer, stable, `search_path = ''`, execute to authenticated only):
        `actable_profile_ids(profile_capability) returns setof uuid` and
        `can_act_for(uuid, profile_capability) returns boolean`.
    *   **Write functions** (definer, `search_path = ''`, execute revoked from public and anon,
        granted to authenticated). Each raises `raise exception '<key>' using errcode = 'P0001'`
        with one of the keys `not_found`, `invalid_input`, `limit_reached`, `self_profile` or
        `adult_permission_required`. A profile the caller cannot act for raises `not_found`, never
        a "forbidden" error. In updates, a null argument means "unchanged". To clear an optional
        field (`date_of_birth` on self, `gender`, `consultation_language`, `contact_phone`,
        `line2`, `landmark`, `latitude`/`longitude`), the caller names it in `p_clear text[]`. A
        name that is not one of these raises `invalid_input`. The function table below gives each
        signature.
    *   **Capability for each function:**
        *   `create_dependent`: an active self-profile grant.
        *   `update_patient_profile`, `archive_dependent` and all three address functions: `manage`.
        *   `restore_dependent`: `read`, and the profile must be archived.
    *   **Caller check:** every write function first requires that the caller holds an active
        self-profile grant. Partner and admin staff have none, so they are rejected.
    *   **Rules:**
        *   The dependent cap counts non-archived dependents only; restore checks the cap again.
        *   `contact_phone` is rejected on the self profile.
        *   An adult dependent (18 or older by date of birth in IST) needs
            `p_adult_permission = true`.
    *   **`ensure_self_profile(p_account uuid)`:** an internal definer helper (execute revoked
        from every API role). If a `profiles` row exists for `p_account` and it has no active self
        grant, it inserts the self profile and the owner grant. Otherwise it does nothing.
    *   **`finish_signup`:** `create or replace function public.finish_signup(text, boolean,
        consent_source)` keeps the same signature and body, and calls
        `perform public.ensure_self_profile(v_uid);` in two places: just before the early return
        `if public.has_current_terms(v_uid) then return;` (this repairs a missing self profile on a
        repeat call), and right after the `profiles` upsert (this covers the first call). Column
        mapping:
        *   `full_name` ← `profiles.full_name`
        *   `consultation_language` ← `profiles.preferred_language`
        *   `created_by` ← `auth.uid()`
        *   every other column: null
    *   **Name mirror:** trigger function `mirror_profile_name()` (definer, `search_path = ''`,
        execute revoked from every API role), attached `after update of full_name on
        public.profiles`. It starts with `if pg_trigger_depth() > 1 then return new; end if;` and
        updates the self profile. `update_patient_profile` on the self profile updates
        `profiles.full_name` in the same way.
    *   **Backfill:** `select public.ensure_self_profile(id) from public.profiles;`, with
        `created_by = profiles.id`. It is safe to run twice.
    *   **`app_settings` rows:** `max_dependents_per_account` (10, not public),
        `profile_retention_days` (null, not public, TODO_HCQ), `recent_auth_minutes` (15, public,
        TODO_HCQ).

| Function | Arguments (in order) | Returns |
|---|---|---|
| `create_dependent` | `p_full_name text, p_date_of_birth date, p_relationship profile_relationship, p_gender profile_gender default null, p_consultation_language text default null, p_contact_phone text default null, p_adult_permission boolean default false` | `uuid` (new profile id) |
| `update_patient_profile` | `p_profile_id uuid, p_full_name text default null, p_date_of_birth date default null, p_gender profile_gender default null, p_consultation_language text default null, p_contact_phone text default null, p_clear text[] default '{}'` | `void` |
| `archive_dependent` / `restore_dependent` | `p_profile_id uuid` | `void` |
| `upsert_patient_address` | `p_profile_id uuid, p_label text, p_line1 text, p_city text, p_state text, p_pincode text, p_address_id uuid default null, p_line2 text default null, p_landmark text default null, p_latitude double precision default null, p_longitude double precision default null, p_clear text[] default '{}'` | `uuid` (address id) |

Required arguments come first and every optional one has `default null` (or a typed default), so
`pnpm db:types` makes them optional in TypeScript and callers simply omit them. Server actions pass
named arguments (`supabase.rpc(name, { p_… })`), so the order only matters to SQL.
| `delete_patient_address` / `set_default_address` | `p_address_id uuid` | `void` |

*   **Covered by**: items 4 and 6.

##### 3. `supabase/migrations/<ts>_account_security.sql` (Create)
*   **Type / Scope**: SQL migration.
*   **Proposed Changes**:
    *   **`auth_is_recent()`:** returns boolean. It is stable and definer, with execute granted to
        authenticated (the server action calls it). It reads `auth.jwt() -> 'amr'` and keeps only
        the methods on its allow-list (from Step 0). It compares whole seconds, because
        `amr` timestamps are epoch seconds: it is true when the newest timestamp is at least
        `floor(extract(epoch from now())) - recent_auth_minutes * 60`. It is false on missing claims,
        and false on a timestamp more than 60 s in the future, which allows for clock skew. The
        pgTAP boundary test builds its timestamps from the same `floor(extract(epoch from now()))`,
        which is fixed for the whole transaction.
    *   **`account_deletion_requests`:** columns `id`, `account_id → auth.users on delete
        restrict`, `status text check (status in ('requested','cancelled'))`, `requested_at`,
        `cancelled_at`, `created_at`, `updated_at`.
        *   A `set_updated_at` trigger and an index on `account_id`.
        *   A partial unique index `(account_id) where status = 'requested'`.
        *   RLS with `account_deletion_requests_select_own`.
        *   Grants: revoke all, then select to authenticated and service_role.
    *   **Functions** (definer, `search_path = ''`, execute granted to authenticated). They raise
        `raise exception '<key>' using errcode = 'P0001'` with the key `reauth_required` (not
        recent). An unauthenticated caller gets `42501`.
        *   `request_account_deletion() returns uuid`: needs `auth_is_recent()`; a repeat returns
            the open request; audits `account.deletion_requested`.
        *   `cancel_account_deletion() returns void`: needs a signed-in user; moves only from
            `requested` to `cancelled` and audits `account.deletion_cancelled`. With no open
            request it does nothing and returns normally (no error, no audit row).
        *   `record_sign_out_everywhere() returns void`: needs `auth_is_recent()`; audits
            `session.sign_out_all`.
*   **Covered by**: item 5.

##### 4. `supabase/tests/03_patient_profiles.test.sql` (Create)
*   **Type / Scope**: pgTAP.
*   **Proposed Changes**: Two synthetic users A and B, created in the test.
    *   **Self profile:** `finish_signup` creates exactly one self profile and grant, and running it
        again adds none. A second call after the early-return path repairs a missing self profile.
        The backfill is idempotent. A user without a `profiles` row gets nothing.
    *   **Isolation:** A cannot select B's `patient_profiles`, `profile_access` or
        `patient_addresses`. A calling any write function on B's ids raises `not_found`.
    *   **Anon:** anon has no select on `patient_profiles`, `profile_access`, `patient_addresses` or
        `app_settings`, and no execute on any of the 9 functions in item 2.
    *   **Rules:**
        *   archiving self raises `self_profile`;
        *   an adult without permission raises `adult_permission_required`;
        *   the cap raises `limit_reached`, and archived dependents do not count;
        *   restore over the cap raises `limit_reached`;
        *   `contact_phone` on self raises `invalid_input`;
        *   a user with no self grant cannot call `create_dependent`;
        *   an archived profile is in `actable_profile_ids('read')` but not `'manage'`;
        *   `view_records` includes self and a minor and excludes an adult dependent.
    *   **Name mirror:** a client update of `profiles.full_name` succeeds and mirrors to the self
        profile without recursion.
    *   **Restrict:** deleting A from `auth.users` fails, and `unconfirmed_users_older_than` never
        returns a user with a grant.
    *   **Audit:** each write function adds one audit row whose metadata keys are only `fields`
        (plus `adult_permission`).
    *   **Settings:** `app_settings` returns only public rows to authenticated.
    *   **Consents:** A cannot read B's consents.

##### 5. `supabase/tests/04_account_security.test.sql` (Create)
*   **Type / Scope**: pgTAP.
*   **Proposed Changes**: JWT claims are set with `set_config('request.jwt.claims', …)`.
    *   **`auth_is_recent`:** true inside the window and exactly at `now − window`; false just past
        it; false for an empty `amr`, for only disallowed methods and for a future timestamp. It
        also follows a changed `recent_auth_minutes` row.
    *   **Deletion requests:** `request_account_deletion` is rejected when not recent, works when
        recent, and a repeat keeps one open request. Cancel works. Cancelling with no open request returns normally and writes no audit row.
        A cannot read B's requests.
    *   **Sign out everywhere:** `record_sign_out_everywhere` is rejected when not recent and audits
        `session.sign_out_all` when recent.
    *   **Audit:** `audit_log` UPDATE, DELETE and TRUNCATE raise for authenticated and service_role.

##### 6. `supabase/tests/05_patient_profile_catalog.test.sql` (Create)
*   **Type / Scope**: pgTAP catalog test.
*   **Proposed Changes**:
    *   For every `public` table with a `patient_profile_id` column except `profile_access`, it
        asserts:
        *   RLS is on;
        *   a select policy calls `actable_profile_ids`;
        *   no policy mentions `account_id`;
        *   authenticated has no insert, update or delete grant.
    *   For `profile_access` it asserts that its only policy is
        `account_id = (select auth.uid())` and that it has no write grants.

##### 7. `packages/db/src/database.types.ts` (Modify)
*   **Type / Scope**: Generated types.
*   **Proposed Changes**: Regenerated with `pnpm db:types` after the migrations.
*   **Covered by**: `pnpm typecheck`.

##### 8. `docs/rls-matrix.md` (Modify)
*   **Type / Scope**: Documentation.
*   **Proposed Changes**: Rows for the five new tables and every new function, the restrict rule, the
    capability meanings and the catalog-test rule.

#### Shared packages

##### 9. `packages/core/src/phone.ts`, `email.ts` + tests (Modify)
*   **Type / Scope**: Existing helpers.
*   **Proposed Changes**:
    *   `maskPhone` returns `+91 •••••• 4321`; other country codes keep their code and the last 4
        digits.
    *   `maskEmail` returns `a•••@example.test`, with the existing `•`, and `*@…` for a
        one-character local part.
    *   Tests to update: `phone.test.ts`, `email.test.ts`, `otp-step.test.tsx`,
        `step-up-step.test.tsx`, `auth-state.test.ts`, `contact-actions.test.tsx`,
        `login-panel.test.tsx`, plus any e2e text match found with
        `grep -rn "XXXX\|•••" apps/web/e2e*`.

##### 10. `packages/core/src/greeting.ts` + `greeting.test.ts` (Create)
*   **Type / Scope**: Pure helper and Vitest.
*   **Proposed Changes**:
    *   `greetingFor(date, timeZone = "Asia/Kolkata")` returns `morning`, `afternoon` or `evening`.
    *   `firstName(fullName)`.
    *   Tests cover IST boundaries 04:59, 05:00, 11:59, 12:00, 16:59 and 17:00 from UTC inputs,
        midnight, extra spaces and a single-word name.

##### 11. `packages/core/src/session-config.ts` + test (Create)
*   **Type / Scope**: Pure helper.
*   **Proposed Changes**:
    *   `SESSION_IDLE_DEFAULT_MINUTES = 30` (TODO_HCQ).
    *   `parseMinutes(value, fallback)` accepts integers 1–1440; anything else gives the fallback.
    *   `idleWarningLeadMs(timeoutMs) = min(120000, timeoutMs / 4)`.
    *   Tests cover each case.

##### 12. `packages/core/src/next-path.ts` + `next-path.test.ts` (Modify)
*   **Type / Scope**: Pure helper.
*   **Proposed Changes**:
    *   Add `safeReturnPath(input, locales)`. It runs `sanitizeNextPath`, then cuts the path at its
        first UUID segment: `/appointments/<uuid>` becomes `/appointments`, and
        `/hi/appointments/<uuid>` becomes `/hi/appointments`.
    *   Tests include encoded and mixed-case UUIDs.

##### 13. `packages/core/src/patient-profile.ts` + test (Create)
*   **Type / Scope**: zod schemas and types.
*   **Proposed Changes**:
    *   Schemas for the dependent and profile fields: name 2–80; date of birth on or after
        1900-01-01 and not in the future; relationship enum without `self` for dependents; E.164
        contact.
    *   Schemas for the address: 6-digit PIN and label length.
    *   `isMinor(dob, now)` in IST.
    *   `PATIENT_PROFILE_ERROR` keys, matching item 2. The existing `PROFILE_ERRORS` and
        `ProfileErrorKey` (contact actions) are left unchanged.
    *   Tests cover each invalid field.

##### 14. `packages/core/src/index.ts` (Modify)
*   **Type / Scope**: Public entry.
*   **Proposed Changes**: Export the items 10–13 helpers.
*   **Covered by**: their tests.

##### 15. `packages/db/src/middleware.ts` + test (Modify)
*   **Type / Scope**: Supabase proxy helper.
*   **Proposed Changes**:
    *   Add `updateSessionWithClaims(request, response)`. It returns `{ response, session }`, where
        `session` is one of:
        *   `none`: no cookie, or missing env;
        *   `valid`;
        *   `invalid`: an `AuthApiError` with a 4xx status, or an invalid-JWT error;
        *   `unknown`: network, 5xx or JWKS fetch failure.
    *   On `invalid` it deletes the `sb-*` auth cookies on the response, but keeps
        `*-code-verifier`.
    *   `updateSession` stays as a wrapper.
    *   Tests cover each state and that the code-verifier cookie is kept.

##### 16. `packages/db/src/session.ts` + test (Create)
*   **Type / Scope**: Server helper (subpath export `./session`).
*   **Proposed Changes**:
    *   `revokeSessionByToken(accessToken)` posts to `<url>/auth/v1/logout?scope=local` with the
        anon key and the given bearer token. It never throws and returns `ok` or `failed`.
    *   It uses the same `typeof window` guard as `admin.ts`.
    *   Tests use a mocked `fetch`.

##### 17. `packages/db/src/storage.ts` + `storage.test.ts` (Create)
*   **Type / Scope**: Server helper (subpath export `./storage`). It uses the `typeof window` guard
    from `admin.ts`, not the `server-only` package.
*   **Proposed Changes**:
    *   `PRIVATE_BUCKETS` (an empty tuple) and `createSignedFileUrl(client, bucket, path)`, with a
        fixed 60 s expiry.
    *   Tests with a fake client:
        *   an unknown bucket and a bad path are rejected;
        *   the expiry is 60;
        *   errors become `null`;
        *   it throws in a browser-like global.

##### 18. `packages/db/package.json` (Modify)
*   **Type / Scope**: Exports.
*   **Proposed Changes**: Add `./session` and `./storage`.
*   **Covered by**: items 16 and 17.

#### apps/web: security (Part A)

##### 19. `apps/web/src/security/route-class.ts` + test (Create)
*   **Type / Scope**: Pure function.
*   **Proposed Changes**:
    *   `routeClass(pathname, locales)`, as in Technical Plan § Route classes, plus
        `PRIVATE_PREFIXES`.
    *   Tests cover each class, `/hi`, trailing slashes, `/appointmentsX` (public) and `/home`.

##### 20. `apps/web/src/security/csp.ts` + test (Create)
*   **Type / Scope**: Pure function.
*   **Proposed Changes**: `buildCsp({ level, nonce?, env })` returns the full directive list from
    the Technical Plan for the chosen Step 0 result, plus `reportingEndpointsHeader()`.
*   **Tests:**
    *   each level's `script-src`;
    *   the Turnstile origin appears only with the site key;
    *   `unsafe-eval` only in development;
    *   `frame-ancestors 'none'`, `object-src 'none'`, `default-src 'self'`, `report-uri` and
        `report-to` are always present;
    *   the private policy never contains `unsafe-inline` in `script-src` under R1 or R2;
    *   under R1 the hash of the emergency-bar script is present.

##### 21. `apps/web/src/security/static-headers.ts` + test (Create)
*   **Type / Scope**: Pure function.
*   **Proposed Changes**: `staticHeaders(env)` returns nosniff, Referrer-Policy, Permissions-Policy,
    `X-Frame-Options`, `Reporting-Endpoints`, and HSTS only when `VERCEL === "1"`. It contains no
    CSP; the proxy sets the CSP.
*   **Tests:** HSTS present with `VERCEL=1` and absent otherwise; each header's value.

##### 22. `apps/web/src/security/rewrite.ts` + test (Create)
*   **Type / Scope**: Proxy helper.
*   **Proposed Changes**:
    *   `buildRequestHeaders(request, { nonce?, requestId })`.
    *   `finalizeResponse(intlResponse, requestHeaders, { rewriteTo? })`. It returns intl's response
        untouched for a redirect. Otherwise it builds `NextResponse.rewrite(target, { request: {
        headers } })` or `NextResponse.next({ request: { headers } })`. The target is `rewriteTo`,
        or intl's `x-middleware-rewrite` header. It copies intl's response headers and cookies.
    *   `applyPrivateHeaders(response, { csp, reportOnly })`.
    *   Tests cover:
        *   `/`, `/hi` and `/hi/`;
        *   refreshed and chunked `sb-…-auth-token.N` cookies;
        *   an invalid token (cookies deleted, no rewrite);
        *   `unknown` (rewrite, cookies kept);
        *   no cookie (no Supabase call, no `Set-Cookie`);
        *   an RSC prefetch;
        *   `/home` → 307 to `/`, and `/hi/home` → 307 to `/hi`;
        *   request headers visible on the final response's override list.

##### 23. `apps/web/src/proxy.ts` + `proxy.test.ts` (Modify)
*   **Type / Scope**: Proxy.
*   **Proposed Changes**:
    *   Order:
        1.  `intl()`, skipped for `/auth`. If it returns a redirect, that response is returned
            (with the private headers when the path is private).
        2.  `updateSessionWithClaims`. Its `setAll` writes refreshed cookies into
            `request.cookies` as well as the response, so the request that server code sees
            carries the new tokens.
        3.  `routeClass`.
        4.  `buildRequestHeaders(request, { requestId, nonce })`, built from the updated request.
            `x-request-id` is a random UUID. Under R2 only, and only for `private` and the
            rewritten home, it adds `x-nonce: <nonce>` and a `content-security-policy` request
            header containing the nonce, which is where Next reads it.
        5.  The home rewrite (switched on once item 53 exists) or the `/home` 307.
        6.  `finalizeResponse`.
        7.  Headers on every matched response: `applyPrivateHeaders` (private CSP, no-store,
            noindex) for `private` and the rewritten home; `applyPublicHeaders` (the public-level
            CSP from `buildCsp`, which includes `frame-ancestors 'none'`) for every other class.
            Static files are outside the matcher and need no CSP; `X-Frame-Options: DENY` from
            `next.config.ts` still covers them.
    *   The matcher is unchanged (`/api/*` is already excluded).
    *   Tests cover each path in the request-flow diagram.

##### 24. `apps/web/next.config.ts` (Modify)
*   **Type / Scope**: Config.
*   **Proposed Changes**: `headers()` returns `staticHeaders(process.env)` for `/(.*)`, with no
    CSP in it. The proxy sets every CSP: the public level on public pages and the private level on
    private pages. Both come from `buildCsp`, so a page never gets two policies (Step 0 confirms
    this). It adds `experimental.sri` only under R1. `security/static-headers.ts` and `security/csp.ts` are
    self-contained for this reason, as `config/env-check.ts` is: relative imports and
    `process.env` only, with no workspace packages and no `@/` alias, because `next.config.ts`
    loads them.
*   **Covered by**: items 21 and 62.

##### 25. `apps/web/src/app/robots.ts` (Create)
*   **Type / Scope**: Metadata route.
*   **Proposed Changes**: Allow `/`. Disallow the private prefixes in English and under `/hi`, plus
    `/auth/` and `/api/`.
*   **Covered by**: item 62.

##### 26. `apps/web/src/app/api/csp-report/route.ts` + test (Create)
*   **Type / Scope**: Route handler.
*   **Proposed Changes**:
    *   Accepts `application/csp-report` and `application/reports+json` up to 8 KB.
    *   Applies the limit `cspReportPerIp` (key kind `csp-ip`, 60 per hour).
    *   Logs `csp.report` with `directive` and `blockedOrigin` only, and always returns 204.
    *   Tests cover both formats, oversize, the rate limit and that no URL or query is logged.

##### 27. `apps/web/src/components/ui/inline-script.tsx` + test (Modify)
*   **Type / Scope**: Component.
*   **Proposed Changes**:
    *   Takes an optional `nonce` prop.
    *   The emergency-bar and language script sources move to exported constants in
        `components/layout/inline-scripts.ts`, so `csp.ts` can hash them under R1.
    *   The test asserts the nonce is rendered when given and absent otherwise.

##### 28. `apps/web/src/components/layout/site-shell.tsx` (Modify)
*   **Type / Scope**: Layout.
*   **Proposed Changes**:
    *   Takes an optional `variant?: "public" | "patient"` that defaults to `"public"`, so
        `(public)/layout.tsx` needs no change.
    *   Only `patient` reads the nonce (`headers()`), inside its own small `<Suspense>` around
        `InlineScript`. The public variant never calls `headers()`, so the public "/" stays
        prerendered.
    *   The variant chooses the signed-in header extras and the bottom-tab set.
*   **Covered by**: items 56, 64 and `test:prerender`.

##### 29. `apps/web/src/features/session/idle-timer.ts` + test (Create)
*   **Type / Scope**: Pure state machine.
*   **Proposed Changes**:
    *   `createIdleTimer({ timeoutMs, warnMs, now, onWarn, onExpire })` with `activity()`, `tick()`
        and `stop()`. `warnMs` comes from `idleWarningLeadMs`.
    *   Tests use a fake clock:
        *   at 30 minutes, the warning comes at 28 and expiry at 30;
        *   at 4 minutes, the warning comes at 3;
        *   activity resets the timer;
        *   activity during the warning cancels it;
        *   throttling and stop.

##### 30. `apps/web/src/features/session/idle-guard.tsx` + test (Create)
*   **Type / Scope**: Client component.
*   **Proposed Changes**:
    *   Wires the events and the `BroadcastChannel("acx-auth")`.
    *   Shows the warning `AlertDialog` (item 76) with "Stay signed in" and "Sign out".
    *   On expiry it runs `useSignOut()`.
    *   Tests cover the warning render, the Stay button, the expiry calling the sign-out sequence,
        and focus moving into the dialog.

##### 31. `apps/web/src/features/session/clear-client-state.ts` + `use-sign-out.ts` + tests (Create)
*   **Type / Scope**: Client helpers.
*   **Proposed Changes**:
    *   `clearClientState()` removes the `acx:` keys from both storages, keeps `acx_location`, and
        posts `signed_out`.
    *   `useSignOut()` awaits `signOutAction()`, then calls `clearClientState()`, then
        `location.replace("/")`. Even if the action fails it still clears the state and navigates.
    *   Tests cover:
        *   other keys and the delivery location stay;
        *   the order of calls;
        *   a failed action still clears and navigates.

##### 32. `apps/web/src/features/session/private-page-guard.tsx` + test (Create)
*   **Type / Scope**: Client component.
*   **Proposed Changes**:
    *   On `pageshow` with `persisted`, it hides the page at once (sets `hidden` on the main
        element), then fetches `/auth/session` with `cache: "no-store"`.
    *   On mount it fetches `/auth/session` once and keeps `userTag` in memory, so nothing has to
        be rendered into the page.
    *   If the later result is `signed_out`, or its `userTag` differs from the stored one,
        `location.replace("/")`. Otherwise it un-hides.
    *   It does the same on a broadcast `signed_out`.
    *   Tests use a mocked `fetch` and dispatched events, covering same user, different user and
        signed out.

##### 33. `apps/web/src/app/[locale]/(patient)/layout.tsx` (Modify) and `(patient)/error.tsx` (Create)
*   **Type / Scope**: Layout and error boundary.
*   **Proposed Changes**:
    *   The layout renders `SiteShell variant="patient"`, `PrivatePageGuard` and `IdleGuard`. The
        idle minutes are read on the server with `parseMinutes` and passed as a prop. Still no auth
        logic.
    *   `error.tsx` shows "We can't load your account right now" and a Try again button for any
        error in the group. Next hides server error details in production, so it does not try to
        recognise `AuthUnavailableError`. The error's `digest` is logged as `requestId`-style
        context only.
*   **Covered by**: items 64 and 67, plus an `error.test.tsx` render test.

##### 34. `apps/web/src/features/auth/server/require-patient.ts` + test (Modify)
*   **Type / Scope**: Guard.
*   **Proposed Changes**:
    *   `loginHref` uses `safeReturnPath`.
    *   On `unavailable` it throws `AuthUnavailableError`.
    *   Adds `requirePatientContext(nextPath)`, which returns the signed-in state plus `profiles`
        and `selected` (item 38), wrapped in `React.cache`.
    *   Tests cover a stripped UUID, `unavailable` throwing, and the selected-profile fallback to
        self.

##### 35. `apps/web/src/features/auth/server/auth-state.ts`, `components/auth-provider.tsx`, `components/header-auth.tsx`, `app/auth/session/route.ts` + tests (Modify)
*   **Type / Scope**: Gate and session state.
*   **Proposed Changes**:
    *   **`auth-state.ts`:** a new `unavailable` state when `my_auth_state` errors. Today that case
        becomes `needs_finish`.
    *   **`auth-provider.tsx`:** its `GateState` gains `unavailable`, and its `next` sanitising uses
        `safeReturnPath`.
    *   **`header-auth.tsx`:** shows Login only on `signed_out`, and a neutral placeholder on
        `unavailable`.
    *   **The other readers of the gate**, `auth-link-interceptor.tsx`, `(public)/login/page.tsx`,
        `login-panel.tsx` and `auth/callback/route.ts`, treat `unavailable` like `signed_out`, but
        show the existing "Sign-in is not available right now" message (`unavailable` error key)
        instead of the form. Each file's test covers this case.
    *   **`/auth/session`:** always `no-store`. Its response adds:
        *   `userTag`: an HMAC of the user id with `RATE_LIMIT_HMAC_SECRET` and prefix `session:`;
        *   `maskedContact`;
        *   `profiles: [{ id, firstName, relationship }]` (non-archived);
        *   `selectedProfileId`;
        *   `addressChip: { label, pin } | null`.

        `avatarUrl` is removed. The route comment becomes "never returns unmasked contact
        details".
    *   Tests cover each state and the new shape, including that no full phone or email ever
        appears.

##### 36. `apps/web/src/lib/log.ts` + test (Modify)
*   **Type / Scope**: Logger.
*   **Proposed Changes**:
    *   New fields:
        *   `directive`: from a closed list of CSP directive names;
        *   `blockedOrigin`: scheme plus host only, lower-cased, or one of `inline`, `eval`, `data`,
            `blob`.
    *   New events and their outcome sets:

        | Event | Outcomes |
        |---|---|
        | `auth.reverify` | `ok`, `mismatch`, `rate_limited`, `invalid_code`, `unavailable` |
        | `auth.sign_out_all` | `ok`, `failed`, `reauth_required` |
        | `account.deletion_request` | `ok`, `reauth_required`, `cancelled` |
        | `profile.switch` | `ok`, `not_found` |
        | `profile.change` | `ok` plus the `PATIENT_PROFILE_ERROR` keys |
        | `session.idle_sign_out` | `ok` |
        | `home.rewrite` | `valid`, `invalid`, `unknown` |
        | `csp.report` | `ok` |

    *   Tests show that unknown fields and out-of-set values are still dropped.

##### 37. `apps/web/src/features/auth/server/rate-limit.ts` + test (Modify)
*   **Type / Scope**: Limits.
*   **Proposed Changes**:
    *   New `KeyKind`s: `reverify-user`, `csp-ip` and `profile-write-user`.
    *   New limits:

        | Limit | Key kind | Window and max |
        |---|---|---|
        | `reverifyPerUser` | `reverify-user` | 5 per hour |
        | `cspReportPerIp` | `csp-ip` | 60 per hour |
        | `profileWritePerUser` | `profile-write-user` | 60 per hour |

    *   The test checks that the same value gives different keys for every kind.

#### apps/web: profiles and account (Part B)

##### 38. `apps/web/src/features/profiles/server/selected-profile.ts` + test (Create)
*   **Type / Scope**: Server helper.
*   **Proposed Changes**:
    *   `listActableProfiles()`: an RLS read that excludes archived profiles, for the switcher.
    *   `getSelectedProfile()`: reads the cookie, then reads through RLS, and returns self with
        `fellBack: true` only when a cookie was present but is archived, forged or unreadable. A
        missing cookie returns self with `fellBack: false`, so new users see no notice.
    *   `PROFILE_COOKIE` options.
    *   Tests with a fake client cover valid, archived, forged and missing cookies.

##### 39. `apps/web/src/features/auth/server/profile-guard.ts` (Create) and `apps/web/src/features/profiles/actions.ts` + `actions.test.ts` (Create)
*   **Type / Scope**: Server actions.
*   **Proposed Changes**:
    *   `profileGuard()` moves out of `features/auth/actions.ts` into its own module, with the same
        behaviour, and both files import it.
    *   **Writes:** `createDependent`, `updatePatientProfile`, `archiveDependent`,
        `restoreDependent`, `upsertAddress`, `deleteAddress` and `setDefaultAddress`. Each:
        1.  calls `profileGuard()`;
        2.  parses its input with the core zod schemas;
        3.  takes an explicit `patientProfileId`;
        4.  applies `profileWritePerUser`;
        5.  calls the RPC with the user's session client;
        6.  maps the error keys.
    *   **`selectProfile(id)`:** sets the cookie only and is not rate limited. It calls
        `profileGuard()`, then `can_act_for(id, 'manage')`, and returns `not_found` otherwise.
    *   Tests cover:
        *   a `needs_finish` caller is rejected;
        *   each invalid field;
        *   a forged id maps to `not_found`;
        *   a double submit;
        *   a server error;
        *   `selectProfile` with another user's id returns `not_found`.

##### 40. `apps/web/src/features/profiles/components/` (Create)
*   **Type / Scope**: Client and server components, each with a `.test.tsx`.
*   **Proposed Changes**:
    *   `profile-switcher.tsx` and `booking-for-switcher.tsx`: render `null` unless there are two or
        more non-archived profiles. They use `DropdownMenu` with a radio group (item 76).
    *   `profile-avatar.tsx`: initials, with the name as an accessible label.
    *   `person-form.tsx`: visible labels and validation on blur. It shows the adult-permission
        checkbox when the date of birth makes the person 18 or older.
    *   `address-list.tsx` and `address-form.tsx`.
    *   `family-list.tsx`: archived items show an "Archived" text label and a Restore button.
    *   `fallback-notice.tsx`.
    *   Each test covers default, empty and error states, keyboard use, and the Hindi strings.

##### 41. `apps/web/src/app/[locale]/(patient)/profile/page.tsx` (Create)
*   **Type / Scope**: Page.
*   **Proposed Changes**: `generateMetadata` with noindex. Inside a `<Suspense>`:
    `requirePatientContext("/profile")`, the selected person's form and address list, and the
    selected-profile fallback notice.
*   **Covered by**: item 66.

##### 42. `apps/web/src/app/[locale]/(patient)/account/page.tsx` (Modify)
*   **Type / Scope**: Page.
*   **Proposed Changes**:
    *   **Sections:** Sign-in methods (`ContactActions`), Security (item 48),
        Consent settings (marketing, plus the Terms and Privacy versions read-only) and Family
        profiles.
    *   Payments and transactions is not rendered in this build.
    *   The `?link=` handling is kept. The name row moves to `/profile`. The no-JavaScript sign-out
        form keeps `signOut()`.
*   **Covered by**: items 66 and 67.

##### 43. `apps/web/src/features/auth/components/contact-actions.tsx` + test, and the affected auth e2e specs (Modify)
*   **Type / Scope**: Component and e2e.
*   **Proposed Changes**:
    *   Labels become "Change" when a contact exists.
    *   Values are shown masked.
    *   `reauth_required` opens `ReverifyDialog`, then retries the action.
    *   Update the text expectations in `e2e-auth/profile-contacts.spec.ts`, `gate.spec.ts` and
        `redirects.spec.ts` for masking and the `/account` layout.
    *   Tests cover the re-verify branch and the masked display.

#### apps/web: account security (Part C)

##### 44. `apps/web/src/features/auth/server/recent-auth.ts` + test (Create)
*   **Type / Scope**: Server helper.
*   **Proposed Changes**: `requireRecentAuth()` calls `getClaims()` (verified), then
    `rpc("auth_is_recent")`. On an RPC error it fails closed with `reauth_required`.
*   **Tests** use a fake client: true, false, no claims, an RPC error, and that it never decodes the
    token itself.

##### 45. `apps/web/src/features/auth/actions.ts` + `actions.test.ts` (Modify)
*   **Type / Scope**: Server actions.
*   **Proposed Changes**:
    *   `addPhone`, `addEmail`, `verifyAdd*` (used for both add and change) and `connectGoogle`
        (it adds a sign-in method) call `requireRecentAuth` first.
    *   **Shared limiter.** `within()` and `limiter` move out of this `"use server"` file into
        `features/auth/server/limiter.ts`, a plain server module that is not exported as an
        action, so it cannot be called as an endpoint. Profile, re-verify and CSP-report code import
        it from there. It keeps using the server-only admin client to call `rate_limit_hit` with
        HMAC keys, exactly as sign-in does today. This is the one documented service-role use near
        the patient area: it touches no patient rows and runs no request on a user's behalf.
        `docs/AUTH.md` records it.
    *   **New actions:**
        *   `sendReverifyCode({ channel? })` and `verifyReverifyCode({ code })`. They follow the
            Technical Plan: own contact only, phone by default, `shouldCreateUser: false`, Turnstile,
            limits, the old token from `getSession()`, the same-user check, and
            `revokeSessionByToken(old)`.
        *   `startGoogle({ flow: "reverify" })` sets the HMAC cookie.
        *   `signOutEverywhere(): Promise<{ ok: boolean; error? }>` runs the sequence from the
            Technical Plan.
        *   `requestAccountDeletion()` and `cancelAccountDeletion()`.
        *   `signOutAction(): Promise<{ ok: boolean }>`.
    *   `signOut()` is unchanged for forms.
    *   **Callers updated to `useSignOut`:** `user-menu.tsx`, `security-section.tsx`,
        `idle-guard.tsx` and the step-up "No" path in `login-panel.tsx`.
    *   Tests:
        *   `reauth_required` versus allowed for each protected action;
        *   a re-verify mismatch signs out;
        *   the code is sent to the stored contact even when the browser sends another;
        *   each limit;
        *   re-verify responses do not differ by whether a contact belongs to another account,
            while change-contact keeps the existing "already in use" result (auth spec), the one
            documented exception.

##### 46. `apps/web/src/app/auth/callback/route.ts` + test (Modify)
*   **Type / Scope**: Route handler.
*   **Proposed Changes**:
    *   `next` uses `safeReturnPath`.
    *   New `flow=reverify` handling:
        1.  Read and clear the HMAC cookie, and check its expiry.
        2.  Keep the old access token, from `getSession()` before the exchange.
        3.  After the exchange, compare user ids. A mismatch signs out and redirects to `/` with
            `?reverify=failed`. A match revokes the old session and redirects to the sanitised
            `next` with `?reverify=ok`.
    *   Tests cover the match, mismatch, missing cookie and expired cookie cases.

##### 47. `apps/web/src/features/auth/components/reverify-dialog.tsx` + test (Create)
*   **Type / Scope**: Client component.
*   **Proposed Changes**:
    *   A `Dialog` (item 76) whose title names the action. It shows the masked destination, "Use
        email instead" when both contacts exist, the existing `OtpStep` input with Turnstile, and
        a Google button when allowed.
    *   It stores `acx:reverify-pending` before a Google redirect and resumes on `?reverify=ok`.
    *   Focus is trapped and restored.
    *   Tests cover each method, a wrong code, the rate-limited message, success calling `onDone`,
        the resume, and the Hindi strings.

##### 48. `apps/web/src/features/auth/components/security-section.tsx` + test (Create)
*   **Type / Scope**: Component.
*   **Proposed Changes**:
    *   **Sign out:** a plain button.
    *   **Sign out everywhere:** an `AlertDialog` that names the action.
    *   **Request account deletion:** an `AlertDialog` with a typed confirmation word, `DELETE` in
        English and `हटाएं` in Hindi, and a button labelled "Request deletion". It explains that
        nothing is deleted at once.
    *   It shows an open request with Cancel.
    *   Tests cover the dialogs, the double-click guard and the re-verify branch.

#### apps/web: patient home and private routes (Part D)

##### 49. `apps/web/src/features/patient-home/contract.ts` (Create)
*   **Type / Scope**: Types.
*   **Proposed Changes**: The `PatientHomeData` types from the Technical Plan. They have no fields
    for conditions, medicines or diagnoses.
*   **Covered by**: `pnpm typecheck` and item 51.

##### 50. `apps/web/src/features/patient-home/sources/real.ts`, `dev-fixtures.ts`, `get-source.ts` + tests (Create)
*   **Type / Scope**: Data sources.
*   **Proposed Changes**:
    *   As in the Technical Plan.
    *   `dev-fixtures.ts` holds the marker `ACX_DEV_FIXTURE_DATA`. The home page passes its
        `searchParams` into the source context. Only the fixture source reads them:
        *   `__fixture_fail=<sectionId>` (one id from the registry) makes that section's loader
            throw;
        *   `__fixture_delay=<ms>` (0–10000) delays every section's loader, for the loading
            screenshot.

        `real.ts` ignores both.
    *   Tests:
        *   `NODE_ENV=production` with the flag set returns `real`;
        *   `development` without the flag returns `real`;
        *   `development` with the flag returns fixtures;
        *   `real` returns empties when there are no tables;
        *   the fail switch is ignored by `real`.

##### 51. `apps/web/src/features/patient-home/sections.ts`, `outline.ts` + tests (Create)
*   **Type / Scope**: Registry and outline.
*   **Proposed Changes**:
    *   `sections.ts` is the ordered registry `{ id, alwaysShown, client, Skeleton, Section }`.
        The section ids, in order, are snake_case and used everywhere (outline, tests, the fixture
        `__fixture_fail` switch): `greeting`, `up_next`, `needs_attention`, `quick_actions`,
        `continue_where_left`, `your_doctors`, `near_you`, `ai_card`, `emergency_line`,
        `complete_profile`.
    *   `outline.ts` has:
        *   `getHomeOutline(ctx)` (server, `React.cache`);
        *   the pure `sectionsToRender(data, flags, dismissed)`, which keeps Up next always, hides
            empty sections, follows the AI flag, and shows "Complete your profile" only when needed
            and not dismissed through the cookie.
    *   Tests cover:
        *   the new-account set (greeting, up_next, quick_actions, near_you, complete_profile);
        *   the full fixture set;
        *   each flag;
        *   dismissed;
        *   the query budget, by counting fake-client calls.

##### 52. `apps/web/src/features/patient-home/sections/*.tsx` + tests (Create)
*   **Type / Scope**: Components.
*   **Proposed Changes**:
    *   **Sections:** `greeting`, `up-next`, `needs-attention`, `slot-hold-timer`, `quick-actions`,
        `continue-where-left` (client, `useSyncExternalStore`), `your-doctors`, `near-you`,
        `ai-card`, `emergency-line` and `complete-profile` (its dismiss action sets the cookie).
        Each has a skeleton of the same minimum height.
    *   **`section-boundary.tsx`:** a client error boundary with "This section could not load" and a
        Try again button that calls `router.refresh()`.
    *   Tests:
        *   each section's render and empty state;
        *   one action per mode;
        *   the timer: text changes each minute, `aria-live` switches at 1 minute, and the expired
            text;
        *   the boundary catches a throwing child while its sibling renders.

##### 53. `apps/web/src/app/[locale]/(patient)/home/page.tsx` (Create)
*   **Type / Scope**: Page (the internal rewrite target).
*   **Proposed Changes**:
    *   Inside `<Suspense>`, `authState()` decides what to render:
        *   `signed_in`: the outline and the section boundaries.
        *   `needs_finish` or `step_up`: a redirect to the gate.
        *   `signed_out` or `unavailable`: `PublicHome`.
    *   `generateMetadata` returns the site title with noindex.
*   **Covered by**: item 64.

##### 54. `apps/web/src/components/home/public-home.tsx` (Create) and `apps/web/src/app/[locale]/(public)/page.tsx` (Modify)
*   **Type / Scope**: Refactor.
*   **Proposed Changes**: The public home body moves into `PublicHome({ flags })`. The page renders it
    unchanged.
*   **Covered by**: `test:prerender` and the existing `e2e/home.spec.ts` and
    `home-experience.spec.ts`.

##### 55. `apps/web/src/app/[locale]/(patient)/appointments/page.tsx` (Modify), `appointments/[id]/page.tsx` (Create), `support/page.tsx` (Create)
*   **Type / Scope**: Pages.
*   **Proposed Changes**:
    *   Appointments: tabs through `?tab=upcoming|past|cancelled`; anything else becomes
        `upcoming`. Each tab has its empty state.
    *   `[id]`: inside its `<Suspense>` it calls `requirePatient("/appointments/<id>")` first, so a
        signed-out visitor is redirected to sign-in, and `next` becomes `/appointments` through
        `safeReturnPath`. Only then does it validate the UUID and call `notFound()`. It always does
        so until bookings exist.
    *   Under `cacheComponents` this check runs after streaming has started, so the HTTP status is
        200. The page shows the not-found content and noindex, which is the same for "does not
        exist" and "not yours". The e2e asserts the content, not the status. A real 404 status is a
        known gap, recorded in `docs/AUTH.md`.
    *   Support: its content.
    *   All three call `requirePatient` inside `<Suspense>` and set noindex.
*   **Covered by**: item 65, plus a tab-parsing unit test.

##### 56. `apps/web/src/components/layout/site-header.tsx`, `features/auth/components/user-menu.tsx` + tests (Modify)
*   **Type / Scope**: Header.
*   **Proposed Changes**:
    *   The signed-in variant adds the address chip from `/auth/session`, the profile switcher, and
        a bell `Popover` (item 76) showing "No notifications yet".
    *   The avatar menu uses initials only (the `<img>` is removed) and shows the first name and the
        masked contact.
    *   Menu items: My appointments, Profile, Account, Support and Sign out (`useSignOut`).
    *   Tests cover keyboard navigation of the menu, that no full contact is shown, and that there is
        no `<img>`.

##### 57. `apps/web/src/components/layout/search-bar.tsx`, `mobile-bottom-nav.tsx` + tests (Modify)
*   **Type / Scope**: Components.
*   **Proposed Changes**:
    *   **Recent searches:** the last 5, stored under `acx:recent-searches`, shown only when signed
        in, with a Clear button.
    *   **Bottom tabs (`variant="patient"`):** Home, Find care, Appointments, Shops (when
        `shopNetwork` is on), Account, plus Medicines when `medicineSales` is on. They have
        safe-area padding and 44 px targets.
    *   Tests cover each flag combination and the recent-searches clear.

##### 58. `apps/web/src/config/env-check.ts` + test (Modify)
*   **Type / Scope**: Build guard.
*   **Proposed Changes**: A Vercel production build (`VERCEL_ENV=production`) fails if
    `PATIENT_HOME_FIXTURES` is set. Other production builds are covered by the source lock (item
    50) and the post-build scan (item 59).
*   **Tests:** the guard fails with the flag set and passes without it.

##### 59. `apps/web/scripts/check-no-fixtures.mjs` (Create) and `apps/web/package.json` (Modify)
*   **Type / Scope**: Build check.
*   **Proposed Changes**: The script scans `<NEXT_DIST_DIR ?? ".next">/server` and `/static` for
    `ACX_DEV_FIXTURE_DATA` and exits 1 if found. It is chained into the build:
    `next build && node scripts/check-no-fixtures.mjs`.
*   **Covered by**: every `pnpm build`.

##### 60. `apps/web/src/i18n/messages/en.json`, `hi.json` (Modify)
*   **Type / Scope**: Strings.
*   **Proposed Changes**:
    *   Extend the existing `appointments` and `account` namespaces.
    *   Add new namespaces `patientHome`, `profile`, `family`, `security`, `reverify`, `idle`,
        `support`, `header.signedIn` and `nav.patient`.
    *   Hindi is a first pass marked TODO-review.
*   **Covered by**: the existing key-parity test.

##### 61. `turbo.json`, `apps/web/.env.example`, root `.env.example` (Modify)
*   **Type / Scope**: Config.
*   **Proposed Changes**:
    *   Add `SESSION_IDLE_MINUTES` and `PATIENT_HOME_FIXTURES` to the `build`, `start`, `dev`,
        `test:e2e` and `test:e2e:auth` env lists.
    *   Document both in the examples, noting that fixtures are for development only.
*   **Covered by**: items 11 and 58.

#### End-to-end tests

##### 62. `apps/web/e2e/security-headers.spec.ts` (Create)
*   **Type / Scope**: Playwright (no Supabase).
*   **Proposed Changes**:
    *   **Public `/`:**
        *   has the public CSP, nosniff, Referrer-Policy, Permissions-Policy and
            `frame-ancestors 'none'`;
        *   has no HSTS locally;
        *   has no `Set-Cookie`;
        *   has Next's prerender `Cache-Control` (`s-maxage` with `stale-while-revalidate`).
    *   **Signed out `/appointments`:** a 200 response with a meta-refresh redirect to
        `/login?next=/appointments`, because `requirePatient` runs after streaming starts. It
        carries `Cache-Control: private, no-store` and `X-Robots-Tag`.
    *   **Signed out `/appointments/<uuid>`:** redirected to sign-in, and `next` has no UUID. This
        spec runs in the final verification, when the route exists.
    *   **Redirects:** `/home` → 307 to `/`, and `/hi/home` → 307 to `/hi`.
    *   **`robots.txt`:** disallows the private paths.

##### 63. `apps/web/e2e-auth/local-db.ts` (Create) and `apps/web/e2e-auth/helpers.ts` (Modify)
*   **Type / Scope**: Test helpers (no new dependency).
*   **Proposed Changes**:
    *   **`local-db.ts`:** runs SQL with `execFile("docker", ["exec", "supabase_db_<project_id>",
        "psql", "-U", "postgres", "-c", sql])`. It reads `project_id` from `supabase/config.toml`
        and refuses to run unless that container exists and the host in
        `NEXT_PUBLIC_SUPABASE_URL` (written to `.env.test.local` by `auth-e2e-env.sh`) is
        `127.0.0.1` or `localhost`.
    *   **`purgeTestUser(id)`:** deletes in order: addresses, grants, profiles, deletion requests,
        then the auth user.
    *   **`setRecentAuthMinutes(n)`** and **`restoreRecentAuthMinutes()`**.
    *   **`deleteTestUsers`** uses `purgeTestUser` and fails loudly on error.
    *   **`logOut()`** and the menu-label waits in `helpers.ts` match the new avatar menu (initials
        and first name, a "Sign out" item calling `useSignOut`). `e2e-auth/email-otp.spec.ts`
        updates its signed-in assertion the same way.
    *   **`signInAs(page, "A" | "B")`:** uses phones `9000000001` and `9000000002` with code
        `123456`, then Finish sign-up.

##### 64. `apps/web/e2e-auth/signed-in-home.spec.ts` and `signed-in-home.fixtures.spec.ts` (Create)
*   **Type / Scope**: Playwright with local Supabase.
*   **Proposed Changes**:
    *   **Main server (3200):**
        *   `/` signed out shows the public home; signed in, it shows the greeting at the same URL;
        *   the new-account section set, with no hero carousel and no trust strip;
        *   `private, no-store` and the private CSP on the signed-in `/`;
        *   CLS below 0.1.
    *   **Fixture server (3201, `next dev`):**
        *   the full home renders;
        *   `?__fixture_fail=your_doctors` isolates that section while the others render.

##### 65. `apps/web/e2e-auth/private-routes.spec.ts` (Create)
*   **Type / Scope**: Playwright.
*   **Proposed Changes**:
    *   Signed out, `/appointments`, `/profile`, `/account` and `/support` redirect to sign-in with a
        safe `next`.
    *   User A opening `/appointments/<random uuid>` sees the not-found content with noindex.
    *   A's switcher lists only A's profiles.
    *   A forged `acx_profile` cookie holding B's profile id makes `/profile` show A's self profile
        with the fallback notice.

##### 66. `apps/web/e2e-auth/family-profiles.spec.ts` (Create)
*   **Type / Scope**: Playwright.
*   **Proposed Changes**:
    *   Add a child; the switcher appears, and switching changes `/profile`.
    *   Adding an adult needs the permission checkbox.
    *   Archive hides the profile from the switcher, and Restore brings it back.
    *   An address added for the child appears for the child only.

##### 67. `apps/web/e2e-auth/account-security.spec.ts` (Create)
*   **Type / Scope**: Playwright (part slow).
*   **Proposed Changes**:
    *   **Recent sign-in expiry:** `setRecentAuthMinutes(1)` runs *before* `signInAs`, so both the
        `amr` check and the server-proof cookie use the 1-minute window; then wait 65 s, then Change phone opens the
        re-verify dialog; after the code the action continues; finally
        `restoreRecentAuthMinutes()`.
    *   **Sign out everywhere:** a second browser context's next private request redirects to
        sign-in.
    *   **Back after sign-out:** `goBack()` shows no greeting and no masked contact, including a
        bfcache restore.
    *   **Idle sign-out:** `page.clock.install()` then `fastForward("28:00")` shows the warning, and
        `fastForward("02:00")` signs out to `/`.

##### 68. `apps/web/e2e-auth/a11y.spec.ts` (Modify)
*   **Type / Scope**: axe and keyboard.
*   **Proposed Changes**:
    *   axe on the signed-in home at 1280 and 360, and on `/profile`, `/account`, `/appointments` and
        `/support`.
    *   Keyboard-only checks:
        *   the header tab order;
        *   the avatar menu opens with Enter, moves with the arrow keys, and Escape restores focus;
        *   the bottom tabs are reachable at 360.

##### 69. `apps/web/playwright.auth.config.ts`, `apps/web/scripts/auth-e2e-env.sh` (Modify)
*   **Type / Scope**: Config.
*   **Proposed Changes**:

| Server | Command | Env (in addition to the shared `pass([...])` list) | Specs |
|---|---|---|---|
| 3200 | `pnpm build && pnpm start --port 3200` (`NEXT_DIST_DIR=.next-auth`) | unchanged | every spec except `*.fixtures.spec.ts` |
| 3201 | `pnpm next dev --port 3201` (`NEXT_DIST_DIR=.next-dev-fixtures`) | `PATIENT_HOME_FIXTURES=1`, `NEXT_PUBLIC_SITE_URL=http://localhost:3201` | `signed-in-home.fixtures.spec.ts`, `screenshots.fixtures.spec.ts` |

*   **Projects:** `desktop` (1280) runs all specs. `mobile-360` runs `a11y.spec.ts`,
    `signed-in-home.spec.ts` and `screenshots.fixtures.spec.ts`. Fixture specs use the 3201
    `baseURL`.
*   **`pass([...])`** gains `PATIENT_HOME_FIXTURES`, which goes to 3201 only.
*   **`auth-e2e-env.sh`** is unchanged apart from documenting the second server.

##### 70. `apps/web/e2e-auth/screenshots.fixtures.spec.ts` (Create) and `docs/designs/signed-in-home/` (Create)
*   **Type / Scope**: Screenshots.
*   **Proposed Changes**: Saves `new-account-1280.png` (from the 3200 server), plus
    `populated-1280.png`, `loading-1280.png` (sections held by a fixture delay),
    `section-error-1280.png` and `mobile-360.png`, all in English. The folder `docs/designs/` is the
    one that exists; see Open Questions for the owner check on storing test screenshots there.

#### Documentation

##### 71. `docs/specs/signed-in-home.md` (Modify)
*   **Type / Scope**: This spec.
*   **Proposed Changes**: Fill in the Step 0 results and the chosen CSP result. Set Status to
    Approved once the owner approves.

##### 72. `docs/AUTH.md` (Modify)
*   **Type / Scope**: Documentation.
*   **Proposed Changes**:
    *   The recent sign-in check and re-verify: the methods, the window row, and the Google
        limitation.
    *   Sign out everywhere and the token window (`jwt_expiry`; recommend 900 s on staging and
        production).
    *   Idle sign-out (client), and the Supabase Pro session settings (time-box, inactivity
        timeout) as a project-lead setting that is not assumed.
    *   The selected-profile and dismissal cookies, the new env vars, the CSP result, and the known
        gaps from Step 0 and the Google mismatch.

##### 73. `CLAUDE.md` (Modify)
*   **Type / Scope**: Repo guide.
*   **Proposed Changes**:
    *   Update the layout section: the `(patient)` routes `/home` (internal), `/profile`, `/account`,
        `/appointments` and `/support`; the folders `features/profiles`, `features/patient-home`,
        `features/session` and `security/`; and `e2e-auth/local-db.ts`.
    *   Commands are unchanged.

##### 74. `docs/DEPLOYMENT.md` (Modify)
*   **Type / Scope**: Documentation.
*   **Proposed Changes**:
    *   The new env vars per environment.
    *   `PATIENT_HOME_FIXTURES` is never set on Vercel.
    *   Migrate before deploying for these migrations.
    *   The project lead first confirms which remotes hold the existing migrations and takes a PITR
        marker.

##### 75. Report-only proposals (no file edit)
*   **Type / Scope**: Final report.
*   **Proposed Changes**: These are for the project lead to apply. `docs/ACureXpress_Product_Context.md`
    is not edited.
    *   The proposed D22: family profiles, shared credentials versus G8 and D8, DPDP consent for
        children and adult dependents, and retention.
    *   The §25 bottom-tab change.
    *   A Product Context change-log entry.

#### Shared UI (added by review)

##### 76. `packages/ui/src/components/{dialog,alert-dialog,popover,dropdown-menu}.tsx` + tests, `packages/ui/src/index.ts`, `packages/ui/src/messages/{en,hi}.json` (Create/Modify)
*   **Type / Scope**: shadcn-style primitives built on the existing `radix-ui` dependency (no new
    dependency).
*   **Proposed Changes**:
    *   Each primitive has a visible focus ring and 44 px targets, and is exported from the index.
    *   Close-button labels are a required `closeLabel` prop, which the app fills from its own
        messages. No package messages are added.
    *   Tests cover open and close, Escape, focus restore and the labels.

##### 77–79. Sign-out and login test wiring
*   **77.** `apps/web/src/features/auth/components/user-menu.test.tsx` (Modify): the menu calls
    `useSignOut` and has no `<img>`.
*   **78.** `apps/web/src/features/auth/components/login-panel.tsx` + `login-panel.test.tsx`
    (Modify): the step-up "No" path (`onNotMine`, today `signOut("/contact")`) uses
    `useSignOut("/contact")`, so the hook takes an optional destination of `/` or `/contact`.
*   **79.** `apps/web/src/app/[locale]/(public)/login/page.tsx` (Modify): `next` uses
    `safeReturnPath`. **Covered by**: `e2e-auth/redirects.spec.ts`.

##### 80. `supabase/tests/02_identity.test.sql` (Modify)
*   **Type / Scope**: Existing pgTAP test.
*   **Proposed Changes**: The test deletes a user who finished sign-up (line 264). With
    `on delete restrict` that delete now raises. Before the delete, the test removes that user's
    `patient_addresses`, `profile_access` and `patient_profiles` rows (it runs as `postgres`), with a
    comment explaining why. The assertion about consents keeps the same meaning: `user_id` becomes
    null when a user is deleted. The restrict behaviour itself is asserted in item 4.

##### 81. `packages/core/src/auth-errors.ts` + test (Modify)
*   **Type / Scope**: Error keys.
*   **Proposed Changes**: Add `reauth_required`, `mismatch` and `invalid_code` to the closed
    `AUTH_ERROR` list, so actions, the logger's outcome set and the dialog all share them.

##### 82. `apps/web/src/app/[locale]/layout.tsx` (Modify)
*   **Type / Scope**: Root locale layout.
*   **Proposed Changes**: Add the client-side namespaces (`patientHome`, `profile`, `family`,
    `security`, `reverify`, `idle`, `support` and the extended `appointments` and `account`) to
    `CLIENT_NAMESPACES`, so client components receive their strings.
*   **Covered by**: the component tests in both languages and item 68.

### Verification Plan

*   **Compilation/Build**: `pnpm build`, which includes `check-no-fixtures.mjs`, then
    `pnpm --filter @acurexpress/web test:prerender` to prove the public "/" is still prerendered.
*   **Unit Tests**: `pnpm test`, in all workspaces, including the en/hi key parity.
*   **Database**: `pnpm db:reset && pnpm db:test && pnpm supabase db lint && pnpm db:types`, on the
    local stack only.
*   **Static Analysis & Linting**: `pnpm lint && pnpm typecheck`, including the boundary rule.
*   **Test Coverage Requirement**: the targets are 80% lines and branches overall and 95% for access
    control (`docs/TESTING.md` §7). Neither is enforced until `@vitest/coverage-v8` is approved,
    which is an existing known gap.
*   **E2E/Integration**: `pnpm test:e2e` (headers, public pages, axe), then
    `apps/web/scripts/auth-e2e-env.sh && pnpm --filter @acurexpress/web test:e2e:auth`. The auth
    suite covers:
    *   the two-user journeys;
    *   recent sign-in expiry;
    *   Back after sign-out;
    *   idle sign-out;
    *   section isolation;
    *   axe and keyboard checks at 360 and 1280;
    *   the screenshots.
*   **Review**: `/security-review` on the diff, because it touches auth, RLS and headers
    (`docs/TESTING.md` §10).
*   **No commits.** The owner asked that all changes stay uncommitted.

*Drafted with EGM*
