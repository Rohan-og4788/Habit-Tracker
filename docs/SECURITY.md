# Security model

This document describes how HabitForge authenticates users, authorizes access, protects mutations and isolates data. It also lists the deliberate limitations of the current build.

---

## 1. Threat model

HabitForge protects personal habit data belonging to authenticated users. The primary threats considered are:

- **Horizontal privilege escalation (IDOR):** one user reading or modifying another user's habits, logs, goals, journal entries, etc.
- **Session hijacking / fixation:** stealing or pre-setting a session token.
- **CSRF:** a third-party site triggering authenticated mutations.
- **Credential attacks:** brute force, credential stuffing, user enumeration.
- **Injection / malformed input:** invalid dates, oversized payloads, unexpected fields.
- **Data leakage:** secrets in the client bundle, internal errors exposed to users, sensitive fields returned in API responses.
- **Abuse:** spam through the contact form, excessive auth attempts.

It does **not** currently defend against a compromised MongoDB instance, a compromised hosting provider, or an attacker with valid production secrets. Those are operational concerns covered in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 2. Authentication

### Passwords

- Hashed with **bcryptjs at cost 12** (`src/lib/auth.ts`).
- Never stored or returned in plaintext.
- `passwordHash` is declared `select: false`, so it is excluded from normal queries. Login explicitly selects it.
- Policy: 8–128 characters with uppercase, lowercase, digit and special character (Zod, `src/lib/validations.ts`).

### Sessions

- Custom, database-backed sessions — no third-party auth provider.
- On login/register/reset, the server generates a 32-byte random token (`crypto.randomBytes(32).toString("hex")`).
- The token is stored in the `Session` collection and sent as the `hf_session` cookie:
  - `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax`
  - `Path=/`
  - 30-day expiry
- A MongoDB TTL index on `expiresAt` removes expired sessions automatically.
- Session validation checks the token, the expiry, and that the user exists and is not soft-deleted.
- **Session fixation prevention:** login, registration and password reset call `destroyAllUserSessions(userId)` before creating a new session.
- Logout deletes the session server-side and clears both cookies.

### Token storage (verification / reset)

- Email verification and password reset tokens are generated with `crypto.randomBytes(32)`.
- Only an **HMAC-SHA256 hash** of the token is stored (`hashToken`), keyed by `AUTH_SECRET`.
- Tokens are single-use (`used: true` after consumption), purpose-scoped and expire (24 hours for verification, 1 hour for reset).
- A leaked database dump does not expose usable tokens.

### User enumeration

- Login returns the same generic `Invalid email or password.` for unknown users and wrong passwords.
- Registration returns a generic success message if the email already exists, without creating a duplicate.
- Forgot-password always returns the same generic message.

---

## 3. CSRF protection

Two layers:

1. **Origin validation (middleware):** for every `POST`/`PUT`/`PATCH`/`DELETE` under `/api/`, if an `Origin` header is present it must match the request host. Mismatches return `403`. This blocks cross-site form/fetch submissions from other origins.
2. **Double-submit token:** a random `hf_csrf` cookie (readable by JavaScript) is issued at login. `POST /api/auth/logout` requires the `x-csrf-token` header to match the cookie using a constant-time comparison.

`SameSite=Lax` on the session cookie provides an additional baseline defense for cross-site requests.

> Because the app is same-origin only, there is no permissive CORS configuration. Third-party API clients are not supported.

---

## 4. Authorization and data isolation

### Server-side session resolution

Every authenticated route resolves the user from the session cookie:

```ts
const auth = await requireAuth(req);
if (auth instanceof NextResponse) return auth;
// auth.userId is derived from the validated session — never from the request body
```

`requireAuth` (`src/lib/api.ts`) connects to the database, reads the cookie, validates the session and returns `{ userId, user }`.

### Ownership scoping

All personal-data queries include `userId` from the session. Examples:

```ts
Habit.findOne({ _id: habitId, userId, deletedAt: null })
HabitLog.findOne({ userId, habitId, localDate })
Goal.findOneAndDelete({ _id: goalId, userId })
JournalEntry.findOne({ userId, date })
```

A resource owned by another user is indistinguishable from a missing resource (`404`). There is no code path that trusts a client-supplied `userId`.

### Dashboard pages

The `(dashboard)` layout is a server component that reads `hf_session`, validates it and redirects unauthenticated users to `/auth/login`. Middleware enforces the same rule before the page renders.

### Habit log integrity

`recordHabitLog` (`src/services/tracking.service.ts`) enforces, in order:

1. The habit exists, belongs to the user and is not deleted.
2. `localDate` is a real calendar date (`isValidLocalDate`).
3. `localDate` is not after today in the **user's** timezone.
4. For `completed`/`partial`, the day is actually scheduled for that habit (`isScheduledDate`).
5. The write is an upsert inside a transaction, backed by the unique index `{ userId, habitId, localDate }`.

This prevents future completions, unscheduled-day completions and duplicate logs even under concurrent requests.

These guarantees are exercised against a real MongoDB replica set by `tests/integration/database.test.ts`, including a cross-user IDOR check (`getHabit`, log writes and log deletion all reject a non-owner) and a direct duplicate-key insert that must fail with `11000`. `tests/integration/api.test.ts` repeats the isolation checks through the actual HTTP route handlers with real session cookies, and `tests/integration/features.test.ts` covers the notification inbox (a stranger attempting to mark another user's notification read receives `404`).

---

## 5. Input validation

- **Zod schemas** validate auth payloads, habits, logs, goals, journal entries, profile updates, contact messages and password changes.
- **Mongoose schema validation** provides a second layer for enums, required fields, max lengths and numeric ranges.
- **Mass-assignment protection:** update handlers use explicit allow-lists (e.g. `src/app/api/settings/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/notifications/preferences/route.ts`, `src/app/api/goals/[id]/route.ts`) rather than spreading the request body into `$set`. The notification route ignores fields such as `userId` even if supplied.
- **Date validation:** `isValidLocalDate` rejects malformed strings and impossible dates (e.g. `2024-02-30`).
- **Body size:** Next.js server actions are capped at 2 MB; route handlers rely on platform limits. No route accepts file uploads in this build.

---

## 6. Rate limiting

Implemented in `src/lib/rate-limit.ts` (fixed-window, in-memory):

| Endpoint | Limit |
| --- | --- |
| `POST /api/auth/register` | 5 / IP / hour |
| `POST /api/auth/login` | 10 / IP / hour |
| `POST /api/auth/forgot-password` | 3 / IP / hour |
| `POST /api/auth/reset-password` | 5 / IP / hour |
| `POST /api/account/password` | 5 / user / 15 min |
| `POST /api/contact` | 5 / IP / hour |

**Limitation:** the store is per-process. On serverless or multi-instance deployments the effective limit is per instance. Replace the store with Redis (or a similar shared store) before relying on rate limits at scale.

---

## 7. HTTP security headers

Configured in `next.config.mjs` for all routes:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-DNS-Prefetch-Control` | `on` |

Cookies additionally use `HttpOnly`, `Secure` (production) and `SameSite=Lax`.

> A Content-Security-Policy is not set in this build. Adding one is recommended before a public launch; it requires allow-listing the styles used by Tailwind/Recharts and the optional external providers.

---

## 8. Sensitive data handling

- `passwordHash`, verification/reset tokens and Stripe identifiers are marked `select: false`.
- `/api/auth/me` and `/api/account` return only profile fields — never hashes or tokens.
- The JSON export explicitly excludes `passwordHash`, `emailVerificationToken`, `passwordResetToken` and `emailUnsubscribeToken`.
- Server errors are logged in full server-side, but production responses return a generic message instead of raw database errors (`serverError` in `src/lib/api.ts`).
- `AUTH_SECRET` is required in production; the development fallback cannot be used in a production build.
- No external API keys are exposed to the browser. Only `NEXT_PUBLIC_APP_URL` is public by design.
- The AI coach sends only aggregate habit statistics, and only when the user has granted `aiConsent`. Journal text is never sent.

---

## 9. Data export and deletion

### Export

`GET /api/export?format=json|csv` is scoped to the authenticated user and writes an `AuditLog` entry. JSON export excludes credentials and tokens.

### Account deletion

`DELETE /api/account` requires the literal confirmation string `DELETE`. It permanently removes documents from all user-owned collections and then deletes the user document:

`sessions`, `verificationtokens`, `habitlogs`, `habitscheduleversions`, `habits`, `goals`, `challengeprogresses`, `challenges`, `journalentries`, `focussessions`, `dailytasks`, `notifications`, `notificationpreferences`, `pushsubscriptions`, `usersettings`, `userachievements`, `subscriptions`, `auditlogs`, `users`.

Cookies are cleared in the response.

---

## 10. Audit logging

`AuditLog` records security-relevant actions (create/update/delete of habit logs, exports, account deletion, password changes, auth events) with `userId`, `action`, `entityType`, `entityId`, optional details and timestamps. Audit logs are deleted with the account.

---

## 11. Dependency and platform advisories

At the time of writing, `npm audit` reports:

- **Critical:** Next.js 14.2.25 advisories (fixed only in newer majors), Vitest 2 / tinypool.
- **High:** `eslint-config-next`, `playwright`, `postcss` (transitive), `zod` (transitive ranges).
- **Moderate:** assorted transitive packages.

These were reviewed but not force-upgraded because the available fixes require breaking major upgrades. Before a public launch:

```bash
npm audit
npm outdated
```

Upgrade Next.js to a patched major, re-run the test suite and the production build, and re-test authentication and cookies.

---

## 12. Known security limitations

| Limitation | Impact | Recommendation |
| --- | --- | --- |
| In-memory rate limiting | Limits are per instance | Use Redis in production. |
| No MFA / 2FA | Account takeover if password leaks | Add TOTP or WebAuthn. |
| No OAuth login | Users must manage a password | Implement a vetted OAuth flow if needed. |
| Email verification not enforced | Unverified users can use the app | Gate sensitive actions until verified, if desired. |
| No CSP | Reduced XSS defense-in-depth | Add a tailored CSP. |
| Stripe checkout not implemented | Pro plan cannot be purchased | Implement with signature-verified webhooks. |
| `HabitScheduleVersion` not written on every edit | Historical schedule reconstruction is incomplete | Write a version on schedule changes. |
| No Sentry integration | Errors are only in platform logs | Add error monitoring. |
| Soft-delete fields on `User`/`Habit` | `deletedAt` is used for filtering, but account deletion is a hard cascade | Keep filters in mind for future features. |

None of these bypass per-user authorization or the habit-log integrity checks.

---

## 13. Reporting a vulnerability

If you find a security issue, please do not open a public issue with exploit details. Contact the deployment owner using the support address configured in `CONTACT_EMAIL`, or use the repository's private security advisory feature. Include:

- A description of the issue and its impact.
- Steps to reproduce.
- The affected route or page.
- Any relevant request/response samples (redact secrets and personal data).

Please allow reasonable time for a fix before public disclosure.
