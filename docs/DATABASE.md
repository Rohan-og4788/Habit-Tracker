# Database schema

HabitForge uses MongoDB with Mongoose 8. Models live in `src/models/` and are re-exported from `src/models/index.ts`. The database name defaults to `habitforge` (override with `MONGODB_DB_NAME`).

The connection is cached across hot reloads and serverless invocations in `src/lib/database.ts`. Mongoose creates indexes automatically on first connection (auto-index is enabled by default). For production, you can pre-create the indexes during a deploy step if your environment disables auto-indexing.

---

## Conventions

- **IDs:** every document has a MongoDB `ObjectId` `_id`. User-owned documents also store `userId: ObjectId` referencing `User`.
- **Timestamps:** all models use `{ timestamps: true }`, producing `createdAt` and `updatedAt` as UTC `Date` values, unless noted otherwise.
- **Local dates:** calendar-day fields (`localDate`, `date`) are stored as **strings** in `YYYY-MM-DD` format, already converted to the user's IANA timezone. This avoids the ambiguity of storing a "day" as an instant.
- **Soft deletes:** `Habit` has `deletedAt`; `User` has `deletedAt`. Account deletion is a hard cascade across collections (see [Data lifecycle](#data-lifecycle)).
- **Enums:** validated at the Mongoose layer and, where user input is accepted, again with Zod in `src/lib/validations.ts`.

---

## Collections overview

| Model | Collection | Purpose |
| --- | --- | --- |
| `User` | `users` | Account, profile, timezone, consent. |
| `Session` | `sessions` | Server-side sessions. |
| `VerificationToken` | `verificationtokens` | Email verification / password reset tokens. |
| `Habit` | `habits` | Habit definitions and scheduling. |
| `HabitLog` | `habitlogs` | One aggregate completion log per habit per local day. |
| `HabitScheduleVersion` | `habitscheduleversions` | Historical schedule snapshots. |
| `Goal` | `goals` | Goals, progress and milestones. |
| `Challenge` | `challenges` | Time-boxed challenges. |
| `ChallengeProgress` | `challengeprogresses` | Per-day challenge check-ins. |
| `JournalEntry` | `journalentries` | Daily journal entries. |
| `FocusSession` | `focussessions` | Focus timer sessions. |
| `DailyTask` | `dailytasks` | Daily planner tasks. |
| `Notification` | `notifications` | In-app/email/push notification records. |
| `NotificationPreference` | `notificationpreferences` | Per-user notification settings. |
| `PushSubscription` | `pushsubscriptions` | Web-push endpoints. |
| `UserSetting` | `usersettings` | UI/locale preferences. |
| `UserAchievement` | `userachievements` | Unlocked achievements. |
| `Achievement` | `achievements` | Achievement definitions (seeded lazily). |
| `Subscription` | `subscriptions` | Plan and Stripe state. |
| `AuditLog` | `auditlogs` | Security-relevant audit events. |

> Mongoose pluralizes model names to derive collection names. `HabitScheduleVersion` → `habitscheduleversions`.

---

## User

`src/models/User.ts` — collection `users`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | String | Required, max 100. |
| `email` | String | Required, unique, lowercased, indexed. |
| `passwordHash` | String | bcrypt hash, `select: false`. |
| `emailVerified` | Boolean | Default `false`. |
| `emailVerificationToken` | String | `select: false` (legacy; live tokens are in `VerificationToken`). |
| `emailVerificationExpires` | Date | `select: false`. |
| `passwordResetToken` | String | `select: false`. |
| `passwordResetExpires` | Date | `select: false`. |
| `role` | String | `user` \| `admin`, default `user`, indexed. |
| `image` | String | Public avatar URL. |
| `bio` | String | Max 500. |
| `timezone` | String | IANA timezone, default `UTC`. |
| `language` | String | Default `en`. |
| `theme` | String | `light` \| `dark` \| `system`, default `system`. |
| `emailNotifications` | Boolean | Default `true`. |
| `pushNotifications` | Boolean | Default `true`. |
| `aiConsent` | Boolean | Default `false`; gates external AI calls. |
| `emailUnsubscribeToken` | String | `select: false`. |
| `googleId` | String | Sparse index; reserved for future OAuth. |
| `lastLoginAt` | Date | Updated on login. |
| `deletedAt` | Date | Soft-delete marker; invalidates sessions. |

**Indexes:** `email` (unique), `role`, `googleId` (sparse).

---

## Session

`src/models/Session.ts` — collection `sessions`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required, indexed. |
| `token` | String | Required, unique, indexed. Stored raw (opaque random 32-byte hex). |
| `expiresAt` | Date | Required, TTL index (`expireAfterSeconds: 0`). |

Sessions are created on register/login/reset, destroyed on logout and all-at-once on password reset/login (session fixation prevention).

---

## VerificationToken

`src/models/VerificationToken.ts` — collection `verificationtokens`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required, indexed. |
| `token` | String | **HMAC-SHA256 hash** of the emailed token, unique, indexed. |
| `purpose` | String | `email_verification` \| `password_reset` \| `email_change`. |
| `expiresAt` | Date | TTL index. |
| `used` | Boolean | Single-use flag. |

Plain tokens are never stored. `AUTH_SECRET` is the HMAC key.

---

## Habit

`src/models/Habit.ts` — collection `habits`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required, indexed. |
| `name` | String | Required, max 200. |
| `description` | String | Max 1000. |
| `category` | String | Enum: `health`, `fitness`, `study`, `career`, `productivity`, `personal-development`, `finance`, `mental-wellness`, `reading`, `other`. |
| `type` | String | `build` \| `quit` \| `one-time`. |
| `trackingType` | String | `boolean` \| `numeric` \| `duration` \| `count` \| `checklist` \| `negative`. |
| `status` | String | `active` \| `archived` \| `paused`. |
| `icon` / `color` | String | UI hints. |
| `targetValue` / `unit` | Number / String | Target for numeric-style habits. |
| `frequency` | String | `daily` \| `weekdays` \| `weekly` \| `monthly` \| `custom`. |
| `weekdays` | [Number] | 0=Sunday … 6=Saturday. Default `[1,2,3,4,5]`. |
| `intervalDays` | Number | Used by `custom` frequency, min 1. |
| `startDate` | Date | Required. |
| `endDate` | Date | Optional. |
| `reminder` | Object | `{ enabled, time, days }`. |
| `gracePeriodMinutes` | Number | Default 0. |
| `difficulty` | String | `beginner` \| `intermediate` \| `advanced`. |
| `priority` | String | `low` \| `medium` \| `high`. |
| `notes` | String | Max 2000. |
| `isPaused`, `pausedAt`, `pauseReason` | — | Pause state. |
| `archivedAt` | Date | Set on archive. |
| `deletedAt` | Date | Soft-delete marker. |
| `lastCompletedAt` | Date | Updated on completion. |
| `currentStreak`, `longestStreak`, `totalCompletions` | Number | Denormalized stats, recomputed from logs. |

**Indexes:** `{ userId, status }`, `{ userId, category }`, `{ userId, createdAt: -1 }`, plus per-field indexes on `userId`, `category`, `type`, `trackingType`, `status`, `frequency`.

**Scheduling rules** are implemented in `isScheduledDate()` in `src/services/streak.service.ts`:

- `daily`: every day between `startDate` and `endDate`.
- `weekdays`: Monday–Friday.
- `weekly`: days listed in `weekdays`.
- `monthly`: same day-of-month as `startDate`.
- `custom`: every `intervalDays` days from `startDate`.

---

## HabitLog

`src/models/HabitLog.ts` — collection `habitlogs`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `habitId` | ObjectId → Habit | Required. |
| `localDate` | String | `YYYY-MM-DD` in the user's timezone. |
| `status` | String | `completed` \| `partial` \| `skipped` \| `missed`. |
| `trackingType` | String | Mirrors the habit's tracking type. |
| `numericProgress` | Object | `{ value, target, unit }`. |
| `durationProgress` | Object | `{ minutes, targetMinutes }`. |
| `checklistProgress` | Object | `{ items: [{ id, checked }], requiredCount }`. |
| `negativeHabitLog` | Object | `{ incidents, avoided, triggerNote }`. |
| `notes` | String | Max 2000. |
| `skippedReason` | String | Max 500. |
| `completedAt` | Date | UTC instant of completion. |

**Indexes:**
- **Unique** `{ userId, habitId, localDate }` — prevents duplicate logs.
- `{ userId, localDate }` — daily queries.
- `{ habitId, localDate }` — per-habit history.

Writes use an upsert keyed on the unique triple, so repeated completion calls update the same document.

---

## HabitScheduleVersion

`src/models/HabitScheduleVersion.ts` — collection `habitscheduleversions`

Stores a snapshot of a habit's schedule so historical scheduling can be reconstructed if the habit's frequency changes.

| Field | Type |
| --- | --- |
| `habitId` | ObjectId → Habit |
| `userId` | ObjectId → User |
| `effectiveFrom` | Date |
| `frequency` | String |
| `weekdays` | [Number] |
| `intervalDays` | Number |
| `startDate`, `endDate` | Date |

**Index:** `{ habitId, effectiveFrom }`.

> The current codebase creates this model and includes it in account deletion, but the habit update service does not yet write new versions on every schedule change. This is a known limitation, not a security issue.

---

## Goal

`src/models/Goal.ts` — collection `goals`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `title` | String | Required, max 200. |
| `description` | String | Max 1000. |
| `targetValue` | Number | Required, min 0. |
| `currentProgress` | Number | Default 0. |
| `unit` | String | Max 50. |
| `deadline` | Date | Optional. |
| `status` | String | `active` \| `completed` \| `paused` \| `overdue`. |
| `priority` | String | `low` \| `medium` \| `high`. |
| `linkedHabitIds` | [ObjectId → Habit] | Optional. |
| `milestones` | Array | `{ id, title, targetValue, achievedAt? }`. |
| `completedAt` | Date | Set when progress reaches target. |

**Indexes:** `{ userId, status }`, `{ userId, deadline }`.

Goals auto-complete when `currentProgress >= targetValue`.

---

## Challenge / ChallengeProgress

`src/models/Challenge.ts` — collection `challenges`

| Field | Type |
| --- | --- |
| `userId` | ObjectId → User |
| `title` | String (required, max 200) |
| `description` | String (max 1000) |
| `startDate`, `endDate` | Date (required) |
| `status` | `active` \| `completed` \| `failed` \| `paused` |
| `linkedHabitIds` | [ObjectId → Habit] |
| `targetValue` | Number |
| `isPublic` | Boolean (default false) |

**Index:** `{ userId, status }`.

`src/models/ChallengeProgress.ts` — collection `challengeprogresses`

| Field | Type |
| --- | --- |
| `userId` | ObjectId → User |
| `challengeId` | ObjectId → Challenge |
| `localDate` | String `YYYY-MM-DD` |
| `completed` | Boolean |
| `value` | Number |

**Index:** **unique** `{ userId, challengeId, localDate }`.

---

## JournalEntry

`src/models/JournalEntry.ts` — collection `journalentries`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `date` | String | `YYYY-MM-DD`. |
| `wentWell`, `struggledWith`, `learned`, `improveTomorrow` | String | Max 2000 each. |
| `mood` | String | `excellent` \| `good` \| `neutral` \| `low` \| `difficult`. |
| `notes` | String | Max 5000. |

**Index:** **unique** `{ userId, date }` — one entry per user per day (upsert).

---

## FocusSession

`src/models/FocusSession.ts` — collection `focussessions`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `habitId` | ObjectId → Habit | Optional link. |
| `plannedMinutes` | Number | Required, min 1. |
| `actualMinutes` | Number | Default 0. |
| `startedAt` | Date | Required, indexed. |
| `endedAt` | Date | Set on completion. |
| `completed` | Boolean | Default false. |
| `interrupted` | Boolean | Default false. |

**Index:** `{ userId, startedAt }`.

---

## DailyTask

`src/models/DailyTask.ts` — collection `dailytasks`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `habitId` | ObjectId → Habit | Optional link. |
| `title` | String | Required, max 300. |
| `description` | String | Max 1000. |
| `date` | String | `YYYY-MM-DD`. |
| `dueTime` | String | `HH:mm`. |
| `priority` | String | `low` \| `medium` \| `high`. |
| `status` | String | `pending` \| `completed` \| `overdue` \| `cancelled`. |
| `order` | Number | Sort order. |
| `timeBlockStart`, `timeBlockEnd` | String | `HH:mm`. |
| `completedAt` | Date | — |

**Index:** `{ userId, date, status }`.

---

## Notification

`src/models/Notification.ts` — collection `notifications`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `type` | String | `habit_reminder`, `daily_morning`, `evening_review`, `incomplete_habit`, `streak_milestone`, `goal_deadline`, `weekly_report`, `monthly_report`, `system`. |
| `channel` | String | `in-app` \| `email` \| `push`. |
| `title` / `body` | String | Max 200 / 1000. |
| `status` | String | `pending` \| `sent` \| `delivered` \| `failed`. |
| `scheduledAt` | Date | Required, indexed. |
| `sentAt`, `deliveredAt` | Date | — |
| `failureReason` | String | Max 1000. |
| `relatedHabitId`, `relatedGoalId` | ObjectId | Optional. |
| `idempotencyKey` | String | Unique, sparse — prevents duplicate sends. |

**Indexes:** `{ userId, scheduledAt, status }`, `{ userId, status }`, unique sparse `idempotencyKey`.

---

## NotificationPreference

`src/models/NotificationPreference.ts` — collection `notificationpreferences`

One document per user (`userId` unique).

| Field | Type | Default |
| --- | --- | --- |
| `emailEnabled` | Boolean | `true` |
| `pushEnabled` | Boolean | `true` |
| `inAppEnabled` | Boolean | `true` |
| `habitReminders` | Boolean | `true` |
| `dailyMorning` | Boolean | `true` |
| `eveningReview` | Boolean | `false` |
| `incompleteReminder` | Boolean | `true` |
| `streakMilestones` | Boolean | `true` |
| `goalDeadlines` | Boolean | `true` |
| `weeklyReport` | Boolean | `false` |
| `monthlyReport` | Boolean | `false` |
| `reminderTime` | String | `09:00` |
| `reminderDays` | [Number] | `[0..6]` |
| `quietHoursStart` / `quietHoursEnd` | String | `22:00` / `08:00` |
| `timezone` | String | `UTC` |

---

## PushSubscription

`src/models/PushSubscription.ts` — collection `pushsubscriptions`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Required. |
| `endpoint` | String | Required, **unique** — deduplicates re-subscriptions. |
| `p256dh`, `auth` | String | Required web-push keys. |
| `userAgent` | String | Optional. |

Only created when VAPID keys are configured and the browser grants permission.

---

## UserSetting

`src/models/UserSetting.ts` — collection `usersettings`

One document per user (`userId` unique).

| Field | Type | Default |
| --- | --- | --- |
| `weekStartDay` | Number (0–6) | `1` |
| `dateFormat` | String | `YYYY-MM-DD` |
| `timeFormat` | String | `12` |
| `defaultReminderTime` | String | `09:00` |
| `defaultCategory` | String | `other` |
| `defaultFrequency` | String | `daily` |
| `reducedMotion` | Boolean | `false` |
| `highContrast` | Boolean | `false` |

---

## Achievement / UserAchievement

`src/models/Achievement.ts` — collection `achievements`

| Field | Type | Notes |
| --- | --- | --- |
| `key` | String | Required, **unique** (e.g. `first-habit`). |
| `title` | String | Required, max 200. |
| `description` | String | Max 500. |
| `category` | String | `first-habit` \| `streak` \| `consistency` \| `goal` \| `completion` \| `milestone`. |
| `badgeIcon` / `badgeColor` | String | UI hints. |
| `threshold` | Number | Value needed to unlock. |
| `secret` | Boolean | Default false. |

Definitions are seeded lazily from `ACHIEVEMENT_DEFINITIONS` in `src/services/achievement.service.ts`; evaluation reads real counts from habits, logs, goals, journal and focus sessions.

`src/models/UserAchievement.ts` — collection `userachievements`

| Field | Type |
| --- | --- |
| `userId` | ObjectId → User |
| `achievementId` | ObjectId → Achievement |
| `unlockedAt` | Date |

**Index:** **unique** `{ userId, achievementId }`.

---

## Subscription

`src/models/Subscription.ts` — collection `subscriptions`

One document per user (`userId` unique).

| Field | Type | Notes |
| --- | --- | --- |
| `plan` | String | `free` \| `pro`. |
| `status` | String | `inactive` \| `active` \| `past_due` \| `canceled` \| `trialing`. |
| `stripeCustomerId` | String | `select: false`. |
| `stripeSubscriptionId` | String | `select: false`. |
| `stripePriceId` | String | `select: false`. |
| `currentPeriodStart` / `currentPeriodEnd` | Date | — |
| `cancelAtPeriodEnd` | Boolean | Default false. |

**Pro access rule:** `plan === "pro" && status === "active"` (enforced in `src/app/api/habits/route.ts`).

---

## AuditLog

`src/models/AuditLog.ts` — collection `auditlogs`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → User | Optional (system events). |
| `action` | String | `create`, `read`, `update`, `delete`, `login`, `logout`, `register`, `export`, `delete_account`, `password_change`. |
| `entityType` / `entityId` | String / Mixed | Affected entity. |
| `details` | Mixed | Extra context. |
| `ipAddress`, `userAgent` | String | Request metadata. |
| `createdAt` | Date | Indexed. |

**Indexes:** `{ userId, createdAt: -1 }`, `{ createdAt: -1 }`.

---

## Relationships

```
User 1─┬─* Session
       ├─* VerificationToken
       ├─* Habit 1─* HabitLog
       │          1─* HabitScheduleVersion
       ├─* Goal ──* Habit (linkedHabitIds)
       ├─* Challenge 1─* ChallengeProgress
       ├─* JournalEntry
       ├─* FocusSession ── Habit (optional)
       ├─* DailyTask ── Habit (optional)
       ├─* Notification
       ├─1 NotificationPreference
       ├─* PushSubscription
       ├─1 UserSetting
       ├─* UserAchievement ── Achievement
       ├─1 Subscription
       └─* AuditLog
```

All user-owned queries filter on `userId` taken from the validated session — never from request parameters. See [SECURITY.md](SECURITY.md).

---

## Date and timezone strategy

1. The browser sends a `localDate` string (`YYYY-MM-DD`) computed in the user's timezone.
2. The server validates it with `isValidLocalDate()` (strict calendar validation).
3. The server rejects dates **after** the user's current local date.
4. The server checks `isScheduledDate(habit, localDate)` and rejects unscheduled days.
5. The log is upserted on `{ userId, habitId, localDate }`.

`localDateBounds(localDate, timezone)` converts a local day to a UTC instant range using `Intl.DateTimeFormat`, and computes the end as **1 ms before the next local day's start**. This is DST-safe: local days may be 23 or 25 hours long.

`localDateString(date, timezone)` converts a UTC instant to the user's local `YYYY-MM-DD`. Invalid timezones fall back to UTC rather than throwing.

---

## Data lifecycle

Account deletion (`deleteAccount` in `src/services/account.service.ts`) removes the user's documents from:

`sessions`, `verificationtokens`, `habits`, `habitlogs`, `habitscheduleversions`, `goals`, `challenges`, `challengeprogresses`, `journalentries`, `focussessions`, `dailytasks`, `notifications`, `notificationpreferences`, `pushsubscriptions`, `usersettings`, `userachievements`, `subscriptions`, `auditlogs`, then the `users` document itself.

Sessions and verification tokens also expire automatically via MongoDB TTL indexes.

---

## Seeding

`scripts/seed.mjs` creates a demo account with:

- 5 habits (duration, numeric, count, negative, boolean) plus their initial schedule versions
- ~30 days of realistic habit logs (121 on the first run)
- 2 goals, 5 journal entries, 8 focus sessions
- 2 daily tasks, notification preferences, user settings, a free subscription

It is idempotent for the demo email: it deletes the previous demo data and recreates it. Do **not** run it against production data.

```bash
npm run seed
```

The seeder is exercised end-to-end by `tests/integration/seed.test.ts`: it runs the script as a real child process against an in-memory replica set, then signs in as the demo account through the API and reads back the seeded habits, logs, analytics and focus sessions, and finally re-runs the script to prove idempotency.

---

## Index creation notes

Mongoose builds the indexes declared in the schemas when it connects. If your MongoDB user cannot create indexes (some managed environments restrict this), create them manually or run the app once with a user that has `createIndex` permission.

The most important index is the unique compound index on `habitlogs`:

```js
db.habitlogs.createIndex(
  { userId: 1, habitId: 1, localDate: 1 },
  { unique: true }
)
```

Without it, concurrent completion requests could create duplicate logs.
