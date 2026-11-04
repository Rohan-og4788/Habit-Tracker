# Deployment guide

This guide covers running HabitForge locally, deploying to Vercel (recommended), and running it on any Node.js host. Optional integrations are documented separately and are safe to leave unconfigured.

---

## 1. Prerequisites

- Node.js **20 LTS** or newer
- npm 10+
- A MongoDB database (MongoDB Atlas free tier is sufficient)
- A domain (for production email links and cookies)

---

## 2. Create the database

### MongoDB Atlas

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Create a database user with read/write access.
3. Add your deployment's outbound IPs to the network access list (Vercel uses dynamic IPs, so `0.0.0.0/0` is common; restrict it if you use a static egress).
4. Copy the connection string:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/habitforge?retryWrites=true&w=majority
```

Set `MONGODB_DB_NAME=habitforge` (or another name). The app creates collections and indexes automatically on first connection.

### Self-hosted MongoDB

Run MongoDB 6+ and point `MONGODB_URI` at it, e.g. `mongodb://localhost:27017/habitforge`.

> **Indexes:** the unique index on `{ userId, habitId, localDate }` is essential for duplicate prevention. Mongoose creates it automatically when the connecting user has `createIndex` permission. If your database user is restricted, create the indexes manually (see [DATABASE.md](DATABASE.md#index-creation-notes)).

---

## 3. Configure environment variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Minimum required:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=habitforge
AUTH_SECRET=<long random secret>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`AUTH_SECRET` is required in production: the app throws if it is missing. In development only, a fixed fallback is used so the build works without a `.env` file.

---

## 4. Run locally

```bash
npm install
npm run seed        # optional demo data
npm run dev
```

Open <http://localhost:3000>.

### Demo credentials (after seeding)

| Field | Value |
| --- | --- |
| Email | `demo@habitforge.app` |
| Password | `Demo1234!` |

Override with `SEED_EMAIL` and `SEED_PASSWORD`. The seed script deletes and recreates the demo account on each run — never point it at production.

---

## 5. Production build

```bash
npm run build
npm run start
```

- `next.config.mjs` sets `output: "standalone"`, producing `.next/standalone`.
- To run the standalone bundle:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js
```

Set `PORT` and `HOSTNAME` as needed.

### Docker (example)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

Pass environment variables at runtime (`docker run --env-file .env ...`). Do not bake secrets into the image.

---

## 6. Deploy to Vercel

### Option A — dashboard

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables (Production and Preview):
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://habitforge.vercel.app`)
   - any optional integrations you use
5. Deploy.

### Option B — CLI

```bash
npm i -g vercel
vercel link
vercel env add MONGODB_URI production
vercel env add AUTH_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
vercel --prod
```

### Important Vercel notes

- Set `NEXT_PUBLIC_APP_URL` to the final production URL **before** deploying, because it is embedded in metadata and email links.
- Add the Vercel deployment URL to your MongoDB Atlas allowlist.
- The included `vercel.json` schedules the reminder cron hourly (see below).
- Serverless functions have execution time limits. The report and analytics endpoints are lightweight, but very large accounts may need pagination.

---

## 7. Reminder cron

`vercel.json` registers:

```json
{
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }]
}
```

To enable it:

1. Set `CRON_SECRET` to a random string in your environment.
2. Redeploy so Vercel picks up the cron.
3. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

If `CRON_SECRET` is unset, the endpoint returns `503` with a setup message and no reminders are created.

For non-Vercel hosts, call the endpoint hourly from your scheduler:

```bash
curl -X POST https://your-domain.com/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

The handler is idempotent per habit per local day.

---

## 8. Optional integrations

Every integration below is **disabled-safe**: without credentials the app shows a clear setup message and never pretends to succeed.

### Email (Resend)

Used for email verification, password reset and the contact form.

1. Create a Resend account and verify your sending domain.
2. Create an API key.
3. Set:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@your-domain.com
CONTACT_EMAIL=support@your-domain.com
```

Without these, verification/reset tokens are still created but no email is sent, and `/api/contact` returns `503`.

### Browser push (VAPID)

1. Generate keys:

```bash
npx web-push generate-vapid-keys
```

2. Set:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@your-domain.com
```

The notifications page calls `/api/notifications/push-key`; when unconfigured it displays a setup notice instead of requesting permission.

### AI coach (OpenAI)

```env
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

The coach only calls the provider when the user has enabled AI consent in their profile. Without a key, or without consent, it returns deterministic local analysis.

### Billing (Stripe)

The free plan is fully functional. To enable Pro:

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
```

> **Current state:** the billing endpoints intentionally return `501` when Stripe is configured, because the optional Stripe SDK checkout flow is not wired into this build. There is no fake payment path. Implementing checkout requires adding the `stripe` SDK, creating Checkout Sessions in `POST /api/subscription`, and verifying webhook signatures in `POST /api/webhooks/stripe` before updating the `Subscription` document. See [Known limitations](../README.md#known-limitations).

### Cloudinary and Sentry

`CLOUDINARY_*` and `SENTRY_DSN` are reserved and documented in `.env.example`, but neither integration is wired into this build. Profile avatars accept a public URL instead.

---

## 9. Post-deploy verification checklist

Run through this once after the first deployment:

- [ ] `/` loads and the “Get started free” button links to `/auth/register`.
- [ ] Register a new account; you are redirected to the dashboard.
- [ ] Create a habit; it appears on the dashboard and habits list.
- [ ] Mark today complete; the streak and calendar update.
- [ ] Try to mark a future day; it is disabled/rejected.
- [ ] Try to create a 6th active habit on the free plan; you get a clear limit message.
- [ ] Create a goal, a journal entry, a focus session and a daily task.
- [ ] Visit `/dashboard/analytics` and `/dashboard/reports`; data reflects your activity.
- [ ] Export JSON and CSV from Settings; downloads contain your data.
- [ ] Change your password; you remain logged in with a new session.
- [ ] Delete a test account with typed `DELETE`; you are logged out.
- [ ] If Resend is configured: register with a real address and confirm the verification email arrives.
- [ ] If VAPID is configured: enable browser push and confirm the browser prompt appears.
- [ ] If Stripe is **not** configured: the subscription page explains billing is unavailable.

---

## 10. Operations

### Backups

Use MongoDB Atlas automated backups, or `mongodump` on a schedule. Test restores periodically. The export endpoints give users their own copy of the data.

### Logs and monitoring

- Vercel captures function logs in the dashboard.
- Server errors are logged to `console.error` with contextual messages.
- Sentry is not wired into this build; add it before relying on production alerting.

### Scaling notes

- **Rate limiting is in-memory.** On multi-instance or serverless deployments each instance has its own counters. Replace `src/lib/rate-limit.ts` with a Redis-backed implementation for consistent limits.
- The MongoDB connection is cached per process; serverless cold starts reconnect automatically.
- Reports and analytics scan a bounded number of days (max 365). Large datasets may benefit from pre-aggregated daily collections.

### Updating dependencies

```bash
npm outdated
npm update
npm test
npm run build
```

`npm audit` currently reports advisories for Next.js 14 and some dev dependencies. Review them before a major upgrade; upgrading Next.js is a breaking change.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `MONGODB_URI is not defined` | Env var missing at runtime | Add it to `.env` / Vercel env and restart. |
| `AUTH_SECRET must be set in production` | Missing secret in prod | Set `AUTH_SECRET` and redeploy. |
| Login succeeds but dashboard redirects to login | Cookie blocked or wrong domain | Ensure `NEXT_PUBLIC_APP_URL` matches the real origin and HTTPS is used in production. |
| `Cross-origin request blocked` | `Origin` header differs from host | Access the app on its canonical URL; do not mix `www` and apex. |
| Emails never arrive | Resend not configured or domain unverified | Set `RESEND_API_KEY`/`EMAIL_FROM` and verify the domain. |
| Contact form returns `503` | Email not configured | Configure Resend. |
| Push button says unavailable | VAPID keys missing | Generate and set `VAPID_*`. |
| Cron returns `503` | `CRON_SECRET` missing | Set it and redeploy. |
| Cron returns `401` | Secret mismatch | Ensure the scheduler sends the same Bearer token. |
| Duplicate logs possible | Unique index not created | Grant `createIndex` or create the index manually. |
| Build fails on `Intl.supportedValuesOf` types | Outdated TypeScript lib | This repo already casts the value; keep `typescript@5.7`. |

---

## 12. Security checklist for production

- [ ] `AUTH_SECRET` is a long random value, unique per environment.
- [ ] `MONGODB_URI` uses a dedicated least-privilege user.
- [ ] `.env` is never committed (it is git-ignored).
- [ ] HTTPS is enforced (Vercel does this automatically).
- [ ] MongoDB network access is restricted where possible.
- [ ] `CRON_SECRET` is set and not reused elsewhere.
- [ ] Backups are enabled.
- [ ] Error monitoring is added if you need alerting.
- [ ] Rate limiting is moved to a shared store for multi-instance deployments.

See [SECURITY.md](SECURITY.md) for the full security model.
