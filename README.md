# HabitForge

HabitForge is a production-ready habit-tracking SaaS built with Next.js 14 (App Router), TypeScript, MongoDB/Mongoose, Tailwind CSS and shadcn-style UI components. It replaces the original static `localStorage` prototype with real authentication, a database-backed API, per-user authorization and working implementations of every advertised feature.

> **Current status:** the codebase builds cleanly and all unit tests pass. Running the app requires a MongoDB connection string (see [Quick start](#quick-start)). External integrations (email, push, AI, Stripe) are optional and fail closed with explicit setup messages when their credentials are absent — they never fake success.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [Documentation](#documentation)
- [Implemented vs. needs credentials](#implemented-vs-needs-credentials)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Features

All of the following are backed by real database reads/writes and are scoped to the authenticated user.

### Authentication & accounts
- Email + password registration and login with bcrypt hashing (cost 12).
- Database-backed sessions (`hf_session` httpOnly cookie, 30-day TTL, Mongo TTL index).
- Email verification and password reset tokens (hashed at rest, single-use, expiring).
- CSRF protection: `hf_csrf` double-submit cookie plus an Origin check in middleware.
- Per-IP and per-user rate limiting on auth, contact and password endpoints.
- Profile management (name, bio, avatar URL, timezone, language, AI consent).
- Password change and typed-`DELETE` permanent account deletion (cascades user data).

### Habit tracking
- Six tracking types: boolean, numeric, duration, count, checklist, negative.
- Frequencies: daily, weekdays, weekly (explicit days), monthly, custom interval.
- Create, edit, duplicate, pause/resume, archive/restore and delete habits.
- Per-day completion with partial progress, notes and skipped reasons.
- One aggregate log per habit per local date (enforced by a unique index).
- Free tier limit of 5 active habits unless the user has an active Pro subscription.
- Habit detail page with streak stats, completion history and log deletion.

### Timezone & date correctness
- All timestamps stored as UTC `Date`; the user's IANA timezone is stored on the account.
- `localDate` is stored as `YYYY-MM-DD` in the user's timezone.
- Future-date completion is rejected; unscheduled days cannot be completed.
- DST-safe day boundaries (verified by unit tests).

### Insights
- Dashboard overview with today's habits, streaks and completion summary.
- Calendar with month grid, completion dots, and mark-done/undo for the selected day.
- Analytics with 7/30/90-day range selection, daily trend and category breakdown.
- Reports page with per-habit performance, category breakdown, JSON/CSV export and print.
- Achievements evaluated server-side from real counts (no hardcoded per-user data).
- AI coach: uses OpenAI only when `AI_API_KEY` is set **and** the user granted consent; otherwise deterministic local analysis.

### Productivity
- Goals with progress, milestones, deadlines and optional linked habits.
- Challenges with date ranges, linked habits and per-day check-ins.
- Daily planner with tasks, priorities, time blocks and drag-free reordering.
- Journal with daily reflection prompts and mood.
- Focus timer with persisted sessions.

### Notifications
- Notification preferences (channels, reminders, quiet hours, report cadence).
- In-app notifications and a notification list API.
- Browser push registration only when VAPID keys are configured; otherwise the UI shows a setup message.
- Hourly reminder cron endpoint protected by `CRON_SECRET`.

### Platform
- Installable PWA (manifest + service worker + icons).
- SEO metadata, Open Graph image, sitemap, robots.
- Global error boundary, 404 page, loading state.
- Security headers (nosniff, DENY framing, referrer policy, permissions policy).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14.2.25 (App Router, React Server Components) |
| Language | TypeScript 5.7 (strict) |
| Database | MongoDB + Mongoose 8 |
| Auth | Custom sessions + bcryptjs (no third-party auth dependency) |
| UI | Tailwind CSS 3.4, Radix primitives, hand-written shadcn-style components |
| Charts | Recharts |
| Validation | Zod |
| Email | Resend (optional) |
| Tests | Vitest (unit), Playwright (e2e) |

---

## Quick start

### Prerequisites
- Node.js 20+ (Node 20 LTS recommended)
- A MongoDB database (Atlas free tier works) or a local `mongod`

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
# then edit .env and set MONGODB_URI and AUTH_SECRET

# 3. (Optional) seed a demo account and sample data
npm run seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

If you ran the seed script, sign in at `/auth/login` with:

- **Email:** `demo@habitforge.app`
- **Password:** `Demo1234!`

(Override with `SEED_EMAIL` / `SEED_PASSWORD` before seeding.)

### Production build

```bash
npm run build
npm run start
```

`next.config.mjs` sets `output: "standalone"`, so the build produces a self-contained server bundle in `.next/standalone` as well.

---

## Environment variables

Only the first block is required. Every optional integration is disabled safely when unset.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string. |
| `MONGODB_DB_NAME` | — | Database name (default `habitforge`). |
| `AUTH_SECRET` | ✅ (prod) | HMAC key for verification/reset tokens. Production throws if missing. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL used for metadata, sitemap and email links. |
| `RESEND_API_KEY` | — | Enables verification, reset and contact email. |
| `EMAIL_FROM` | — | Sender address for Resend. |
| `CONTACT_EMAIL` | — | Recipient for the contact form. |
| `CRON_SECRET` | — | Bearer token required by `/api/cron/reminders`. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | — | Enable browser push. |
| `AI_API_KEY` / `AI_MODEL` | — | Enable the OpenAI-backed coach. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` | — | Enable Pro billing. |
| `CLOUDINARY_*` | — | Reserved for image uploads (not enabled). |
| `SENTRY_DSN` | — | Reserved for error monitoring (not enabled). |
| `SEED_EMAIL` / `SEED_PASSWORD` | — | Seed script overrides. |

Generate `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

See [`.env.example`](.env.example) for inline comments.

---

## Project structure

```
.
├── middleware.ts                 # Auth guard, redirects, Origin/CSRF check
├── next.config.mjs               # Standalone output, security headers
├── tailwind.config.ts
├── vercel.json                   # Hourly reminder cron
├── scripts/
│   └── seed.mjs                  # Idempotent demo-data seeder
├── tests/
│   ├── unit/                     # Vitest: streak/timezone + validation
│   └── e2e/                      # Playwright: public + auth flows
├── docs/
│   ├── DATABASE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
└── src/
    ├── app/
    │   ├── (marketing)/          # Landing, features, pricing, about, contact,
    │   │                         # privacy, terms, auth pages
    │   ├── (dashboard)/
    │   │   ├── layout.tsx        # Server-side session guard
    │   │   └── dashboard/        # All authenticated pages
    │   ├── api/                  # Route handlers (see docs/API.md)
    │   ├── auth/logout/          # Logout route
    │   ├── layout.tsx            # Root layout + metadata
    │   ├── error.tsx
    │   ├── loading.tsx
    │   ├── not-found.tsx
    │   ├── opengraph-image.tsx
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/
    │   ├── habits/               # Today list, habits grid
    │   ├── layout/               # Dashboard shell (sidebar + mobile nav)
    │   └── ui/                   # shadcn-style primitives
    ├── lib/                      # auth, session, csrf, db, api, email, push,
    │                             # rate-limit, validations, utils
    ├── models/                   # 20 Mongoose models + index barrel
    └── services/                 # Business logic (habit, streak, tracking,
                                  # analytics, goal, journal, focus, report,
                                  # challenge, achievement, export, reminder,
                                  # daily-task, account, ai)
```

### Dashboard routes

| Route | Page |
| --- | --- |
| `/dashboard` | Overview: today's habits, streaks, progress |
| `/dashboard/habits` | Habit list with filters |
| `/dashboard/habits/add` | Create habit |
| `/dashboard/habits/[id]` | Habit detail, history, actions |
| `/dashboard/habits/[id]/edit` | Edit habit |
| `/dashboard/calendar` | Month calendar with completion state |
| `/dashboard/analytics` | Trends and category analytics |
| `/dashboard/goals` | Goals list |
| `/dashboard/goals/add` | Create goal |
| `/dashboard/journal` | Daily journal |
| `/dashboard/focus` | Focus timer |
| `/dashboard/daily-planner` | Daily tasks |
| `/dashboard/challenges` | Challenges and check-ins |
| `/dashboard/achievements` | Achievement badges |
| `/dashboard/reports` | Server-generated report + export |
| `/dashboard/notifications` | Notification preferences and push |
| `/dashboard/settings` | Account, preferences, data, deletion |
| `/dashboard/profile` | Profile, locale, AI consent |
| `/dashboard/subscription` | Plan and usage |
| `/dashboard/help` | FAQ and support |

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Production build (type-checks and lints). |
| `npm run start` | Serve the production build. |
| `npm run lint` | Next.js ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run seed` | Seed the demo account and sample data. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run test:e2e` | Run Playwright e2e tests. |

> Playwright needs its browser binaries once: `npx playwright install chromium`.

---

## Testing

```bash
npm test
```

Current result: **29 tests across 2 files, all passing.**

- `tests/unit/streak.test.ts` — local-date validation, timezone conversion, DST-safe day bounds, scheduling rules, progress calculation.
- `tests/unit/validations.test.ts` — Zod schemas for registration, login, habits, logs and journal.

E2E (public pages and 404) runs against a dev server:

```bash
npx playwright install chromium
npm run test:e2e
```

Current result: **6 passed, 1 skipped** (the authenticated flow is skipped unless `E2E_EMAIL` and `E2E_PASSWORD` are set).

---

## Documentation

- [Database schema](docs/DATABASE.md) — collections, fields, indexes, relationships, date strategy.
- [API reference](docs/API.md) — every route, method, auth requirement and response shape.
- [Deployment guide](docs/DEPLOYMENT.md) — MongoDB Atlas, Vercel, cron, optional integrations.
- [Security model](docs/SECURITY.md) — sessions, CSRF, authorization, data isolation, limitations.

---

## Implemented vs. needs credentials

### Fully implemented (no credentials required)

- Registration, login, logout, session validation, password reset/verification flows.
- Habit CRUD, scheduling, pause/resume, archive/restore, duplicate.
- Habit logging with per-user scoping, future-date rejection and unscheduled-day rejection.
- Streaks, calendar, analytics, reports, achievements.
- Goals, journal, focus sessions, daily planner, challenges.
- Settings, profile, notification preferences, data export, account deletion.
- PWA manifest/service worker, SEO files, error/404/loading pages.
- Unit tests and Playwright public-page tests.

### Implemented but disabled without credentials

| Integration | Required env vars | Behaviour when unset |
| --- | --- | --- |
| Transactional email (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` | Verification/reset links are generated but not emailed; contact form returns `503` with a setup message. |
| Browser push | `VAPID_*` | Notifications page shows a setup message; no fake subscription. |
| AI coach | `AI_API_KEY` | Deterministic local analysis is returned instead. |
| Stripe billing | `STRIPE_*` | Subscription page explains billing is unavailable; `POST /api/subscription` returns `503`/`501`. |
| Image uploads (Cloudinary) | `CLOUDINARY_*` | Profile accepts a public avatar URL instead. |
| Error monitoring (Sentry) | `SENTRY_DSN` | Not wired into this build. |
| Reminder cron | `CRON_SECRET` | Cron endpoint returns `503` with setup instructions. |

---

## Known limitations

- **MongoDB is required.** The app cannot run without `MONGODB_URI`; there is no in-memory or file fallback.
- **No live database was exercised in the development sandbox** used to build this repo (no credentials were available). The schema, services and routes are covered by type-checking, unit tests and a production build, but a smoke test against a real database is recommended after deployment.
- **Stripe checkout is not wired to the Stripe SDK.** Billing endpoints return explicit `501`/`503` messages rather than creating fake subscriptions. The free tier is fully functional.
- **Email delivery requires Resend.** Verification/reset tokens are created regardless, but users cannot receive the link until email is configured.
- **Rate limiting is in-memory.** For multi-instance/serverless deployments, replace `src/lib/rate-limit.ts` with a Redis-backed limiter.
- **No OAuth login.** The `googleId` field exists on the user model for future use, but no Google flow is implemented.
- **npm audit reports advisories** for Next.js 14, Vitest 2 and some transitive packages. Upgrading Next.js to a patched major is a breaking change and was intentionally deferred.
- **Avatar uploads** are not enabled; the profile accepts a URL only.
- **The seed script is intended for development**, not production. It deletes and recreates the demo account on each run.

---

## License

MIT
