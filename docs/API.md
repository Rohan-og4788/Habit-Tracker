# API reference

All API routes live under `src/app/api/` and are implemented as Next.js App Router route handlers. They return JSON unless noted (export and email verification redirect).

---

## Authentication

HabitForge uses a **database-backed session cookie**, not a bearer token.

| Cookie | HttpOnly | Purpose |
| --- | --- | --- |
| `hf_session` | Yes | Opaque 32-byte session token. Sent automatically by the browser. |
| `hf_csrf` | No | Double-submit CSRF token, readable by client code. |

- Sessions last **30 days** and expire automatically via a MongoDB TTL index.
- Login and password reset destroy all existing sessions for the user before creating a new one (session-fixation prevention).
- `AUTH_SECRET` is used to HMAC verification/reset tokens. In production the app throws on startup if it is missing.

### Authorizing requests

For browser clients, include cookies (`credentials: "same-origin"` is the default for same-origin `fetch`). Example:

```ts
const res = await fetch("/api/habits", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

### CSRF

Two layers protect cookie-authenticated mutations:

1. **Origin check (middleware):** any `POST`/`PUT`/`PATCH`/`DELETE` under `/api/` with an `Origin` header must match the request host, otherwise `403`.
2. **Explicit token (logout):** `POST /api/auth/logout` additionally requires `x-csrf-token` to match the `hf_csrf` cookie.

The app is same-origin only; there is no CORS relaxation for third-party API consumers.

---

## Common error format

```json
{ "error": "Human-readable message." }
```

| Status | Meaning |
| --- | --- |
| `200` / `201` | Success. |
| `400` | Validation error or missing parameter. |
| `401` | No valid session. |
| `403` | Forbidden (cross-origin, CSRF failure, free-tier limit). |
| `404` | Resource not found **for this user** (also used instead of leaking existence). |
| `429` | Rate limited. |
| `500` | Unexpected server error. |
| `501` / `503` | Optional integration not configured. |

All authenticated routes resolve the user from the session cookie and scope every query with `userId`. A resource belonging to another user behaves exactly like a missing resource (`404`).

---

## Auth routes

### `POST /api/auth/register`

Public. Rate limit: 5 per IP per hour.

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Str0ng!Pass",
  "timezone": "Europe/London"
}
```

Password requirements: 8–128 chars, at least one uppercase, lowercase, digit and special character. `timezone` is optional and validated as an IANA zone (falls back to `UTC`).

**200** — sets session + CSRF cookies:

```json
{
  "user": { "id": "...", "name": "Ada Lovelace", "email": "ada@example.com", "emailVerified": false },
  "message": "Account created. Please verify your email."
}
```

If the email already exists, the endpoint returns a generic success message and does **not** create a duplicate account (enumeration resistance).

### `POST /api/auth/login`

Public. Rate limit: 10 per IP per hour.

```json
{ "email": "ada@example.com", "password": "Str0ng!Pass" }
```

**200** sets new cookies:

```json
{ "user": { "id": "...", "name": "...", "email": "...", "emailVerified": true } }
```

**401** — `{ "error": "Invalid email or password." }` for both unknown users and wrong passwords.

### `POST /api/auth/logout`

Requires session and `x-csrf-token` header.

**200** — clears both cookies: `{ "message": "Logged out." }`

**403** — invalid/missing CSRF token.

### `GET /auth/logout`

Convenience sign-out used by the dashboard shell. Destroys the session, clears cookies and redirects to `/`.

### `GET /api/auth/me`

Requires session.

**200**:

```json
{
  "authenticated": true,
  "user": {
    "id": "...", "name": "...", "email": "...", "emailVerified": true,
    "image": "", "bio": "", "timezone": "UTC", "language": "en",
    "theme": "system", "emailNotifications": true, "pushNotifications": true,
    "aiConsent": false, "role": "user"
  }
}
```

**401** — `{ "authenticated": false }`.

### `POST /api/auth/forgot-password`

Public. Rate limit: 3 per IP per hour.

```json
{ "email": "ada@example.com" }
```

Always returns `200` with `{ "message": "If an account exists, a reset email was sent." }`. Creates a hashed, single-use token valid for 1 hour and emails the link only if Resend is configured.

### `POST /api/auth/reset-password`

Public. Rate limit: 5 per IP per hour.

```json
{ "token": "<token from email>", "password": "NewStr0ng!Pass" }
```

**200** — resets the password, marks the email verified, invalidates the token, destroys all sessions and creates a fresh session.

**400** — `{ "error": "Invalid or expired reset token." }`.

### `GET /api/auth/verify-email?token=...`

Public. Verifies the token and redirects to `/auth/verify-email?success=1` or `?error=invalid_or_expired`.

---

## Account

### `GET /api/account`

Requires session. Returns the profile:

```json
{
  "id": "...", "name": "...", "email": "...", "bio": "", "image": "",
  "timezone": "UTC", "language": "en", "theme": "system",
  "emailNotifications": true, "pushNotifications": true, "aiConsent": false,
  "emailVerified": true, "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### `PATCH /api/account`

Requires session. Any subset of:

```json
{
  "name": "Ada Lovelace",
  "bio": "Building better habits.",
  "image": "https://example.com/avatar.png",
  "timezone": "Europe/London",
  "language": "en",
  "theme": "dark",
  "aiConsent": true,
  "emailNotifications": true,
  "pushNotifications": false
}
```

**200** — `{ "user": { ...updated user } }`.

### `DELETE /api/account`

Requires session.

```json
{ "confirm": "DELETE" }
```

Permanently deletes the user and all owned data (cascade), clears cookies. **400** if `confirm` is not exactly `DELETE`.

### `POST /api/account/password`

Requires session. Rate limit: 5 per user per 15 minutes.

```json
{ "currentPassword": "OldPass1!", "newPassword": "NewPass1!" }
```

**200** — `{ "ok": true }`. **400** if the current password is wrong or the new one fails policy.

---

## Habits

### `GET /api/habits`

Requires session. Query parameters:

| Param | Values | Default |
| --- | --- | --- |
| `status` | `active` \| `archived` \| `paused` | all non-deleted |
| `category` | habit category enum | all |
| `type` | `build` \| `quit` \| `one-time` | all |
| `search` | string | — |
| `sortBy` | `name` \| `createdAt` \| `currentStreak` \| `priority` | `createdAt` |
| `sortDir` | `asc` \| `desc` | `desc` |
| `page` | integer | `1` |
| `limit` | integer | `50` |

**200**:

```json
{
  "items": [ /* habits */ ],
  "total": 12,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

### `POST /api/habits`

Requires session. Enforces the free-tier limit (5 active habits) unless the user has `plan: "pro"` and `status: "active"`.

```json
{
  "name": "Morning walk",
  "description": "20 minutes before work",
  "category": "fitness",
  "type": "build",
  "trackingType": "duration",
  "targetValue": 20,
  "unit": "minutes",
  "frequency": "daily",
  "weekdays": [1, 2, 3, 4, 5],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "reminder": { "enabled": true, "time": "07:30", "days": [1, 2, 3, 4, 5] },
  "difficulty": "beginner",
  "priority": "medium",
  "notes": ""
}
```

**201** — the created habit. **403** when the free-tier limit is reached.

### `GET /api/habits/[id]`

Requires session. **200** habit, **404** if not owned by the caller.

### `PATCH /api/habits/[id]`

Requires session. Accepts a partial habit update (only fields owned by the user are applied). **200** updated habit.

### `DELETE /api/habits/[id]`

Requires session. Deletes the habit and its logs. **200** `{ "message": "Habit deleted." }`.

### Habit actions

All require session and return the updated habit:

| Route | Effect |
| --- | --- |
| `POST /api/habits/[id]/archive` | `status = "archived"`, sets `archivedAt`. |
| `POST /api/habits/[id]/restore` | `status = "active"`, clears archive fields. |
| `POST /api/habits/[id]/pause` | `status = "paused"`, sets `isPaused`/`pausedAt`. |
| `POST /api/habits/[id]/resume` | `status = "active"`, clears pause fields. |
| `POST /api/habits/[id]/duplicate` | Creates a copy for the same user. **201**. |

---

## Habit logs

### `GET /api/habit-logs`

Requires session. Query: `habitId` (optional), `from` and `to` (`YYYY-MM-DD`, optional).

**200** — `{ "logs": [ ... ] }`.

### `POST /api/habit-logs`

Requires session.

```json
{
  "habitId": "...",
  "localDate": "2024-06-15",
  "timezone": "America/New_York",
  "status": "completed",
  "trackingType": "numeric",
  "numericProgress": { "value": 10, "target": 10, "unit": "pages" },
  "notes": "Finished before lunch."
}
```

Type-specific payloads:

- `duration`: `durationProgress: { minutes, targetMinutes }`
- `checklist`: `checklistProgress: { items: [{ id, checked }], requiredCount }`
- `negative`: `negativeHabitLog: { incidents, avoided, triggerNote? }`

**201** — the upserted log. **400** for a future date, an unscheduled day, or invalid input.

### `DELETE /api/habit-logs?habitId=...&localDate=YYYY-MM-DD`

Requires session. Deletes the log and recomputes habit aggregates.

**200** - `{ "message": "Log deleted." }`. **404** if no log exists for that habit/date (including logs owned by another user).

### `GET /api/habit-logs/[id]?localDate=YYYY-MM-DD`

Requires session. `[id]` is the habit id. Returns one log or `404`.

---

## Analytics and reports

### `GET /api/analytics`

Requires session.

| Param | Values | Default |
| --- | --- | --- |
| `section` | `overview` \| `trends` \| `habits` \| `categories` | `overview` |
| `days` | 1–365 (trends) | `30` |
| `timezone` | IANA zone | account timezone |

Responses:

- `overview`: `{ totalHabits, activeHabits, completedToday, scheduledToday, completionRate, currentStreak, longestStreak, ... }`
- `trends`: `{ "trend": [{ date, completed, scheduled, rate }] }`
- `habits`: `{ "habits": [{ habitId, name, completed, scheduled, rate }] }`
- `categories`: `{ "categories": [{ category, completed, scheduled, rate }] }`

### `GET /api/reports?days=30`

Requires session. Returns a server-generated report:

```json
{
  "from": "2024-05-17", "to": "2024-06-15", "days": 30,
  "scheduled": 120, "completed": 87, "completionRate": 73,
  "activeDays": 24,
  "bestDay": { "date": "2024-06-01", "completionRate": 100 },
  "daily": [{ "date": "2024-05-17", "scheduled": 4, "completed": 3, "completionRate": 75 }],
  "habits": [{ "habitId": "...", "name": "Read", "category": "reading", "scheduled": 30, "completed": 25, "completionRate": 83 }],
  "categories": [{ "category": "reading", "scheduled": 30, "completed": 25, "completionRate": 83 }],
  "focusMinutes": 200, "focusSessions": 8, "journalEntries": 5,
  "goalsCompleted": 1, "challengesActive": 0
}
```

---

## Goals

### `GET /api/goals?status=active`

Requires session. **200** — `{ "goals": [ ... ] }`.

### `POST /api/goals`

Requires session.

```json
{
  "title": "Walk 100 km",
  "description": "This quarter",
  "targetValue": 100,
  "unit": "km",
  "deadline": "2024-09-30",
  "priority": "high",
  "linkedHabitIds": ["..."],
  "milestones": [{ "id": "m1", "title": "25 km", "targetValue": 25 }]
}
```

**201** — the goal.

### `GET /api/goals/[id]`

Requires session. **200** goal or **404**.

### `PATCH /api/goals/[id]`

Requires session. Three modes:

- Progress increment: `{ "increment": 5 }`
- Recalculate from linked habit logs: `{ "action": "recalc" }`
- Field update: any of `title`, `description`, `targetValue`, `currentProgress`, `unit`, `deadline`, `status`, `priority`, `linkedHabitIds`, `milestones`.

Auto-completes when `currentProgress >= targetValue`.

### `DELETE /api/goals/[id]`

Requires session. **200** `{ "ok": true }`.

---

## Journal

### `GET /api/journal`

Requires session. **200** — `{ "entries": [ ... ] }` (newest first).

### `POST /api/journal`

Requires session. Upserts by date.

```json
{
  "date": "2024-06-15",
  "wentWell": "Morning walk",
  "struggledWith": "Late screen time",
  "learned": "Smaller sessions help",
  "improveTomorrow": "Phone away at 22:00",
  "mood": "good",
  "notes": ""
}
```

**201** — the entry.

### `GET|PATCH|DELETE /api/journal/[id]`

Requires session. `[id]` is the **local date** (`YYYY-MM-DD`), not an ObjectId. `PATCH` accepts any journal field. `DELETE` returns `{ "ok": true }`.

---

## Focus sessions

### `GET /api/focus-sessions`

Requires session. **200** — `{ "sessions": [ ... ] }`.

### `POST /api/focus-sessions`

Requires session.

```json
{ "habitId": "...", "plannedMinutes": 25, "startedAt": "2024-06-15T09:00:00.000Z" }
```

**201** - the session. **400** if `plannedMinutes` is not between 1 and 1440, or `startedAt` is not a valid date.

### `PATCH /api/focus-sessions/[id]`

Requires session.

```json
{ "actualMinutes": 25, "completed": true, "interrupted": false, "endedAt": "2024-06-15T09:25:00.000Z" }
```

**200** - the updated session. **400** if no valid update field is supplied or `endedAt` is invalid. **404** if the session does not belong to the caller.

### `DELETE /api/focus-sessions/[id]`

Requires session. **200** `{ "ok": true }`. **404** if the session does not exist or belongs to another user.

---

## Daily tasks

### `GET /api/daily-tasks?date=YYYY-MM-DD`

Requires session. `date` defaults to today in the account timezone. **200** — `{ "tasks": [ ... ], "date": "..." }`.

### `POST /api/daily-tasks`

Requires session.

```json
{
  "title": "Prepare tomorrow's clothes",
  "description": "Remove morning friction",
  "date": "2024-06-15",
  "dueTime": "21:00",
  "priority": "medium",
  "habitId": "...",
  "timeBlockStart": "20:30",
  "timeBlockEnd": "20:45"
}
```

**201** - the task. **400** if the title is missing or `date` is not a valid `YYYY-MM-DD` date.

### `PATCH /api/daily-tasks`

Requires session. Reorders tasks:

```json
{ "date": "2024-06-15", "orderedIds": ["id1", "id2"] }
```

**200** — `{ "tasks": [ ... ] }`.

### `PATCH /api/daily-tasks/[id]`

Requires session. Partial update (title, description, dueTime, priority, status, time blocks). **200** task. **400** if `date` is invalid; **404** if the task does not exist or belongs to another user.

### `DELETE /api/daily-tasks/[id]`

Requires session. **200** `{ "ok": true }`. **404** if the task does not exist or belongs to another user.

---

## Challenges

### `GET /api/challenges`

Requires session. **200** — `{ "challenges": [ ... ] }` including progress summaries.

### `POST /api/challenges`

Requires session.

```json
{
  "title": "30-day reading challenge",
  "description": "Read every day",
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "linkedHabitIds": ["..."],
  "targetValue": 30,
  "isPublic": false
}
```

**201** — the challenge. **400** if dates are missing, invalid, or the end precedes the start.

### `PATCH /api/challenges/[id]`

Requires session. Partial update. **200** challenge. **400** for invalid dates; **404** if the challenge does not exist or belongs to another user.

### `DELETE /api/challenges/[id]`

Requires session. **200** `{ "ok": true }`. **404** if the challenge does not exist or belongs to another user.

### `POST /api/challenges/[id]/check-in`

Requires session.

```json
{ "localDate": "2024-06-15", "completed": true, "value": 1 }
```

`localDate` defaults to today in the account timezone. **201** — the progress document (upserted per day, so repeat check-ins update rather than duplicate). **400** if the date is invalid or outside the challenge window; **404** if the challenge does not exist or belongs to another user.

---

## Achievements

### `GET /api/achievements`

Requires session. Evaluates achievements from real data, then returns:

```json
{
  "achievements": [
    { "_id": "...", "key": "first-habit", "title": "First Step", "description": "...", "category": "first-habit", "badgeIcon": "Sparkles", "badgeColor": "#6366F1", "threshold": 1, "unlocked": true }
  ],
  "unlockedCount": 4,
  "totalCount": 18
}
```

---

## Notifications

### `GET /api/notifications`

Requires session. Returns notification preferences (creating defaults if needed). This route backs the notifications page.

### `PATCH /api/notifications`

Requires session. Partial preference update using an explicit allow-list (the same fields as `/api/notifications/preferences`). Unknown or privileged fields such as `userId` are ignored. **400** if no recognised field is supplied.

### `POST /api/notifications`

Requires session. Registers a browser push subscription:

```json
{ "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } }
```

Only meaningful when VAPID keys are configured. **200** `{ "ok": true }`. **503** when VAPID keys are absent (the integration fails closed rather than pretending to subscribe). **400** for a malformed subscription.

### `GET /api/notifications/preferences`

Requires session. Returns the user's notification preference document.

### `PATCH /api/notifications/preferences`

Requires session. Allowed fields: `emailEnabled`, `pushEnabled`, `inAppEnabled`, `habitReminders`, `dailyMorning`, `eveningReview`, `incompleteReminder`, `streakMilestones`, `goalDeadlines`, `weeklyReport`, `monthlyReport`, `reminderTime`, `reminderDays`, `quietHoursStart`, `quietHoursEnd`, `timezone`.

### `GET /api/notifications/push-key`

Requires session.

```json
{ "configured": true, "publicKey": "<VAPID public key>" }
```

When push is not configured: `{ "configured": false, "publicKey": "" }`.

### `GET /api/notifications/inbox`

Requires session. Returns the caller's most recent in-app notifications plus an unread count:

```json
{
  "notifications": [
    { "_id": "...", "type": "habit_reminder", "title": "Time for Morning walk", "body": "...", "status": "sent", "readAt": null, "createdAt": "..." }
  ],
  "unreadCount": 3
}
```

Query: `limit` (1-100, default 20), `unreadOnly=true` to return only unread items. **400** for an invalid `limit`. Always scoped to the authenticated user.

### `PATCH /api/notifications/inbox/[id]`

Requires session. Body `{ "read": true | false }` (defaults to `true`). **200** `{ "notification": {...} }`. **400** for a malformed id; **404** if the notification does not exist or belongs to another user.

### `POST /api/notifications/inbox/read-all`

Requires session. Marks every unread notification of the caller as read. **200** `{ "modified": 3 }`.

### `POST /api/cron/reminders`

Creates due in-app reminders (one per habit per local day, guarded by an idempotency key). Protected by `CRON_SECRET`: **503** with setup instructions when the secret is unset, **401** when the bearer token is wrong, **200** `{ "ok": true, "created": ..., "emailed": ..., "skipped": ... }` otherwise. See the [deployment guide](DEPLOYMENT.md) for the Vercel cron configuration.

---

## Settings

### `GET /api/settings`

Requires session. Returns the user's `UserSetting` document (creating defaults if needed).

### `PATCH /api/settings`

Requires session. Allowed fields: `weekStartDay`, `dateFormat`, `timeFormat`, `defaultReminderTime`, `defaultCategory`, `defaultFrequency`, `reducedMotion`, `highContrast`.

---

## Subscription

### `GET /api/subscription`

Requires session.

```json
{
  "subscription": {
    "plan": "free", "status": "inactive",
    "currentPeriodStart": null, "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false
  },
  "billingConfigured": false
}
```

### `POST /api/subscription`

Requires session. **503** when `STRIPE_SECRET_KEY`/`STRIPE_PRICE_PRO` are missing, **501** when configured but the Stripe SDK checkout flow is not enabled. It never returns a fake checkout URL or success.

---

## Export

### `GET /api/export?format=json|csv`

Requires session.

- `json`: full account export (profile, habits, logs, goals, journal, focus sessions, tasks, challenges, progress, achievements), with `Content-Disposition: attachment`.
- `csv`: habit logs with habit names and progress columns.

Both write an `AuditLog` entry.

---

## AI coach

### `POST /api/ai/coach`

Requires session.

```json
{ "days": 30 }
```

**200**:

```json
{
  "provider": "local",
  "message": "You are most consistent with ...",
  "configured": false,
  "consentRequired": false
}
```

- `provider` is `"openai"` only when `AI_API_KEY` is set **and** the user has `aiConsent: true`.
- Otherwise it returns deterministic local analysis (`provider: "local"`).
- Only aggregate habit statistics are sent to an external provider; journal text is never sent.

---

## Contact

### `POST /api/contact`

Public. Rate limit: 5 per IP per hour.

```json
{
  "name": "Ada",
  "email": "ada@example.com",
  "type": "feedback",
  "message": "I love the calendar view."
}
```

`type` is one of `feedback`, `bug`, `feature`, `other`.

- **200** `{ "ok": true, "message": "Message sent." }` when Resend is configured.
- **503** with a setup message when `RESEND_API_KEY` is missing.
- **502** if the provider rejects the send.

---

## Cron

### `GET|POST /api/cron/reminders`

Protected by `CRON_SECRET`. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; an `x-cron-secret` header is also accepted.

- **503** if `CRON_SECRET` is not configured.
- **401** if the provided secret is wrong.
- **200** `{ "ok": true, "date": "...", "checkedHabits": 12, "created": 3, "emailed": 3, "skipped": 9, "emailConfigured": true }`.

The handler is idempotent per habit per local day via `Notification.idempotencyKey`.

---

## Stripe webhook

### `POST /api/webhooks/stripe`

- **503** when `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is missing.
- **501** when configured but the optional Stripe SDK integration is not enabled.

No payment is ever treated as successful without signature verification and a real Stripe event.

---

## Route summary

| Method(s) | Route |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/auth/logout` |
| GET | `/api/auth/me` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |
| GET | `/api/auth/verify-email` |
| GET, PATCH, DELETE | `/api/account` |
| POST | `/api/account/password` |
| GET, POST | `/api/habits` |
| GET, PATCH, DELETE | `/api/habits/[id]` |
| POST | `/api/habits/[id]/archive` |
| POST | `/api/habits/[id]/restore` |
| POST | `/api/habits/[id]/pause` |
| POST | `/api/habits/[id]/resume` |
| POST | `/api/habits/[id]/duplicate` |
| GET, POST, DELETE | `/api/habit-logs` |
| GET | `/api/habit-logs/[id]` |
| GET | `/api/analytics` |
| GET | `/api/reports` |
| GET, POST | `/api/goals` |
| GET, PATCH, DELETE | `/api/goals/[id]` |
| GET, POST | `/api/journal` |
| GET, PATCH, DELETE | `/api/journal/[id]` |
| GET, POST | `/api/focus-sessions` |
| PATCH, DELETE | `/api/focus-sessions/[id]` |
| GET, POST, PATCH | `/api/daily-tasks` |
| PATCH, DELETE | `/api/daily-tasks/[id]` |
| GET, POST | `/api/challenges` |
| PATCH, DELETE | `/api/challenges/[id]` |
| POST | `/api/challenges/[id]/check-in` |
| GET | `/api/achievements` |
| GET, POST, PATCH | `/api/notifications` |
| GET | `/api/notifications/inbox` |
| POST | `/api/notifications/inbox/read-all` |
| PATCH | `/api/notifications/inbox/[id]` |
| GET, PATCH | `/api/notifications/preferences` |
| GET | `/api/notifications/push-key` |
| GET, PATCH | `/api/settings` |
| GET, POST | `/api/subscription` |
| GET | `/api/export` |
| POST | `/api/ai/coach` |
| POST | `/api/contact` |
| GET, POST | `/api/cron/reminders` |
| POST | `/api/webhooks/stripe` |
