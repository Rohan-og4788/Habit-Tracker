import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Verifies the advertised `npm run seed` command end-to-end: the seeder runs as
// a real child process against an in-memory replica set, then the app's own
// route handlers sign in as the seeded account and read the seeded data.
let replset: MongoMemoryReplSet;
let uri: string;

let loginRoute: typeof import("@/app/api/auth/login/route");
let habitsRoute: typeof import("@/app/api/habits/route");
let logsRoute: typeof import("@/app/api/habit-logs/route");
let analyticsRoute: typeof import("@/app/api/analytics/route");
let focusRoute: typeof import("@/app/api/focus-sessions/route");

const SEED_EMAIL = "demo@habitforge.app";
const SEED_PASSWORD = "Demo1234!";
const DB_NAME = "habitforge_seed_test";

let ipSeq = 0;

function api(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return api(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function setCookieHeaders(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeader(res: Response): string {
  return setCookieHeaders(res).map((value) => value.split(";")[0]).join("; ");
}

function runSeed() {
  ipSeq += 1;
  return spawnSync(process.execPath, ["-r", "dotenv/config", "scripts/seed.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MONGODB_URI: uri,
      MONGODB_DB_NAME: DB_NAME,
      SEED_EMAIL,
      SEED_PASSWORD,
    },
    encoding: "utf8",
    timeout: 120_000,
  });
}

async function counts() {
  const db = mongoose.connection.db!;
  const names = ["users", "habits", "habitlogs", "habitscheduleversions", "goals", "focussessions"];
  const out: Record<string, number> = {};
  for (const name of names) out[name] = await db.collection(name).countDocuments();
  return out;
}

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  uri = replset.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = DB_NAME;

  const seeded = runSeed();
  if (seeded.status !== 0) {
    throw new Error(`seed.mjs failed (${seeded.status}):\n${seeded.stdout}\n${seeded.stderr}`);
  }

  vi.resetModules();
  delete (global as any).mongoose;

  loginRoute = await import("@/app/api/auth/login/route");
  habitsRoute = await import("@/app/api/habits/route");
  logsRoute = await import("@/app/api/habit-logs/route");
  analyticsRoute = await import("@/app/api/analytics/route");
  focusRoute = await import("@/app/api/focus-sessions/route");

  const dbConnect = (await import("@/lib/database")).default;
  await dbConnect();
}, 300_000);

afterAll(async () => {
  await mongoose.disconnect();
  delete (global as any).mongoose;
  if (replset) await replset.stop();
});

describe("seed script", () => {
  it("signs in the seeded demo account", async () => {
    const res = await loginRoute.POST(
      jsonRequest(
        "/api/auth/login",
        { email: SEED_EMAIL, password: SEED_PASSWORD },
        { "x-forwarded-for": `10.30.0.${(ipSeq % 250) + 1}` }
      )
    );
    expect(res.status).toBe(200);
    expect(cookieHeader(res)).toContain("hf_session=");
  });

  it("serves the seeded habits, logs and analytics", async () => {
    const login = await loginRoute.POST(
      jsonRequest(
        "/api/auth/login",
        { email: SEED_EMAIL, password: SEED_PASSWORD },
        { "x-forwarded-for": `10.30.1.${(ipSeq % 250) + 1}` }
      )
    );
    expect(login.status).toBe(200);
    const cookie = cookieHeader(login);

    const habits = await habitsRoute.GET(api("/api/habits", { headers: { cookie } }));
    expect(habits.status).toBe(200);
    const habitData = await habits.json();
    expect(habitData.items).toHaveLength(5);
    expect(habitData.items.map((h: any) => h.name)).toContain("Morning walk");

    const logs = await logsRoute.GET(api("/api/habit-logs", { headers: { cookie } }));
    expect(logs.status).toBe(200);
    expect((await logs.json()).logs.length).toBeGreaterThan(50);

    const analytics = await analyticsRoute.GET(
      api("/api/analytics?section=overview&timezone=UTC", { headers: { cookie } })
    );
    expect(analytics.status).toBe(200);
    const overview = await analytics.json();
    expect(overview.totalActiveHabits).toBe(5);
    expect(overview.totalTrackingDays).toBeGreaterThan(0);

    const focus = await focusRoute.GET(api("/api/focus-sessions", { headers: { cookie } }));
    expect(focus.status).toBe(200);
    const sessions = (await focus.json()).sessions;
    expect(sessions).toHaveLength(8);
    for (const session of sessions) {
      expect(session.plannedMinutes).toBeGreaterThanOrEqual(1);
    }
  });

  it("is idempotent when run again", async () => {
    const before = await counts();

    const rerun = runSeed();
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toContain("Removed previous demo account data.");

    const after = await counts();
    expect(after).toEqual(before);
    expect(after.users).toBe(1);
    expect(after.habits).toBe(5);
    expect(after.habitscheduleversions).toBe(5);
  });
});
