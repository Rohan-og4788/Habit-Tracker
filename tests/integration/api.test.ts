import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Full HTTP-layer integration: route handlers + real cookies + real MongoDB.
// Middleware (Origin check) is not in this path; it is covered by the e2e run.
let replset: MongoMemoryReplSet;

let registerRoute: typeof import("@/app/api/auth/register/route");
let loginRoute: typeof import("@/app/api/auth/login/route");
let logoutRoute: typeof import("@/app/api/auth/logout/route");
let meRoute: typeof import("@/app/api/auth/me/route");
let habitsRoute: typeof import("@/app/api/habits/route");
let habitRoute: typeof import("@/app/api/habits/[id]/route");
let logsRoute: typeof import("@/app/api/habit-logs/route");
let analyticsRoute: typeof import("@/app/api/analytics/route");

let ipSeq = 0;
function nextIp(): string {
  ipSeq += 1;
  return `10.10.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`;
}

function api(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

function jsonRequest(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Request {
  return api(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
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
  return setCookieHeaders(res)
    .map((value) => value.split(";")[0])
    .join("; ");
}

function cookieValue(res: Response, name: string): string {
  for (const raw of setCookieHeaders(res)) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index > -1 && pair.slice(0, index).trim() === name) {
      return pair.slice(index + 1);
    }
  }
  return "";
}

const PASSWORD = "Str0ng!Pass";

async function registerUser(email = `api${Date.now()}${ipSeq}@example.com`) {
  const res = await registerRoute.POST(
    jsonRequest(
      "/api/auth/register",
      { name: "API User", email, password: PASSWORD, timezone: "UTC" },
      { "x-forwarded-for": nextIp() }
    )
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  return { res, body, cookie: cookieHeader(res), csrf: cookieValue(res, "hf_csrf"), email };
}

async function createHabit(cookie: string, name: string) {
  const res = await habitsRoute.POST(
    jsonRequest("/api/habits", { name, trackingType: "boolean", frequency: "daily" }, { cookie })
  );
  expect(res.status).toBe(201);
  return res.json();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function recentWeekend(): string {
  const cursor = new Date();
  cursor.setUTCHours(12, 0, 0, 0);
  for (let i = 0; i < 7; i += 1) {
    if (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
      return cursor.toISOString().slice(0, 10);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  throw new Error("No weekend day found in the last week");
}

async function clearDatabase() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = replset.getUri();
  process.env.MONGODB_DB_NAME = "habitforge_api_integration";

  // Make sure the database module reads the URI above, not a cached module
  // from another test file in the same worker.
  vi.resetModules();
  delete (global as any).mongoose;

  registerRoute = await import("@/app/api/auth/register/route");
  loginRoute = await import("@/app/api/auth/login/route");
  logoutRoute = await import("@/app/api/auth/logout/route");
  meRoute = await import("@/app/api/auth/me/route");
  habitsRoute = await import("@/app/api/habits/route");
  habitRoute = await import("@/app/api/habits/[id]/route");
  logsRoute = await import("@/app/api/habit-logs/route");
  analyticsRoute = await import("@/app/api/analytics/route");

  const dbConnect = (await import("@/lib/database")).default;
  await dbConnect();
  const { User } = await import("@/models/User");
  const { Habit } = await import("@/models/Habit");
  const { HabitLog } = await import("@/models/HabitLog");
  await Promise.all([User.init(), Habit.init(), HabitLog.init()]);
}, 300_000);

beforeEach(async () => {
  await clearDatabase();
});

afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 75));
});

afterAll(async () => {
  await mongoose.disconnect();
  delete (global as any).mongoose;
  if (replset) await replset.stop();
});

describe("API integration", () => {
  it("registers, returns a session, and logs out with a CSRF token", async () => {
    const { cookie, csrf } = await registerUser();

    expect(cookie).toContain("hf_session=");
    expect(cookie).toContain("hf_csrf=");
    expect(csrf).not.toBe("");

    const me = await meRoute.GET(api("/api/auth/me", { headers: { cookie } }));
    expect(me.status).toBe(200);
    expect((await me.json()).authenticated).toBe(true);

    const anonymous = await meRoute.GET(api("/api/auth/me"));
    expect(anonymous.status).toBe(401);

    const missingCsrf = await logoutRoute.POST(
      api("/api/auth/logout", { method: "POST", headers: { cookie } })
    );
    expect(missingCsrf.status).toBe(403);

    const logout = await logoutRoute.POST(
      api("/api/auth/logout", {
        method: "POST",
        headers: { cookie, "x-csrf-token": csrf },
      })
    );
    expect(logout.status).toBe(200);

    const afterLogout = await meRoute.GET(api("/api/auth/me", { headers: { cookie } }));
    expect(afterLogout.status).toBe(401);
  });

  it("logs in with a valid password and rejects a wrong one", async () => {
    const { email } = await registerUser();

    const wrong = await loginRoute.POST(
      jsonRequest(
        "/api/auth/login",
        { email, password: "WrongPass1!" },
        { "x-forwarded-for": nextIp() }
      )
    );
    expect(wrong.status).toBe(401);

    const ok = await loginRoute.POST(
      jsonRequest(
        "/api/auth/login",
        { email, password: PASSWORD },
        { "x-forwarded-for": nextIp() }
      )
    );
    expect(ok.status).toBe(200);
    expect(cookieHeader(ok)).toContain("hf_session=");
  });

  it("rejects unauthenticated habit access", async () => {
    const list = await habitsRoute.GET(api("/api/habits"));
    expect(list.status).toBe(401);

    const create = await habitsRoute.POST(
      jsonRequest("/api/habits", { name: "No session" })
    );
    expect(create.status).toBe(401);
  });

  it("enforces the free-tier limit of five active habits", async () => {
    const { cookie } = await registerUser();

    for (let i = 1; i <= 5; i += 1) {
      await createHabit(cookie, `Habit ${i}`);
    }

    const sixth = await habitsRoute.POST(
      jsonRequest("/api/habits", { name: "Habit 6" }, { cookie })
    );
    expect(sixth.status).toBe(403);
    expect((await sixth.json()).error).toMatch(/5 active habits/i);
  });

  it("records, upserts, reads and deletes a habit log", async () => {
    const { cookie } = await registerUser();
    const habit = await createHabit(cookie, "Logged habit");

    const payload = {
      habitId: habit._id,
      localDate: today(),
      timezone: "UTC",
      status: "completed",
      trackingType: "boolean",
    };

    const created = await logsRoute.POST(
      jsonRequest("/api/habit-logs", payload, { cookie })
    );
    expect(created.status).toBe(201);
    const createdLog = await created.json();

    const duplicate = await logsRoute.POST(
      jsonRequest("/api/habit-logs", { ...payload, notes: "second" }, { cookie })
    );
    expect(duplicate.status).toBe(201);
    expect((await duplicate.json())._id).toBe(createdLog._id);

    const list = await logsRoute.GET(
      api(`/api/habit-logs?habitId=${habit._id}`, { headers: { cookie } })
    );
    expect(list.status).toBe(200);
    expect((await list.json()).logs).toHaveLength(1);

    const removed = await logsRoute.DELETE(
      api(`/api/habit-logs?habitId=${habit._id}&localDate=${today()}`, {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(removed.status).toBe(200);

    const missing = await logsRoute.DELETE(
      api(`/api/habit-logs?habitId=${habit._id}&localDate=${today()}`, {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(missing.status).toBe(404);
  });

  it("returns 400 for future and unscheduled completions", async () => {
    const { cookie } = await registerUser();
    const habit = await createHabit(cookie, "Scheduled habit");

    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 1);

    const futureRes = await logsRoute.POST(
      jsonRequest(
        "/api/habit-logs",
        {
          habitId: habit._id,
          localDate: future.toISOString().slice(0, 10),
          timezone: "UTC",
          status: "completed",
          trackingType: "boolean",
        },
        { cookie }
      )
    );
    expect(futureRes.status).toBe(400);
    expect((await futureRes.json()).error).toMatch(/future/i);

    const weekdaysHabitRes = await habitsRoute.POST(
      jsonRequest(
        "/api/habits",
        { name: "Weekdays habit", frequency: "weekdays" },
        { cookie }
      )
    );
    expect(weekdaysHabitRes.status).toBe(201);
    const weekdaysHabit = await weekdaysHabitRes.json();

    const unscheduled = await logsRoute.POST(
      jsonRequest(
        "/api/habit-logs",
        {
          habitId: weekdaysHabit._id,
          localDate: recentWeekend(),
          timezone: "UTC",
          status: "completed",
          trackingType: "boolean",
        },
        { cookie }
      )
    );
    expect(unscheduled.status).toBe(400);
    expect((await unscheduled.json()).error).toMatch(/not scheduled/i);
  });

  it("prevents cross-user access to habits (IDOR)", async () => {
    const owner = await registerUser();
    const stranger = await registerUser();
    const habit = await createHabit(owner.cookie, "Private habit");

    const get = await habitRoute.GET(
      api(`/api/habits/${habit._id}`, { headers: { cookie: stranger.cookie } }),
      { params: { id: habit._id } }
    );
    expect(get.status).toBe(404);

    const patch = await habitRoute.PATCH(
      api(`/api/habits/${habit._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: stranger.cookie },
        body: JSON.stringify({ name: "Hijacked" }),
      }),
      { params: { id: habit._id } }
    );
    expect(patch.status).toBe(404);

    const del = await habitRoute.DELETE(
      api(`/api/habits/${habit._id}`, {
        method: "DELETE",
        headers: { cookie: stranger.cookie },
      }),
      { params: { id: habit._id } }
    );
    expect(del.status).toBe(404);

    const stillThere = await habitRoute.GET(
      api(`/api/habits/${habit._id}`, { headers: { cookie: owner.cookie } }),
      { params: { id: habit._id } }
    );
    expect(stillThere.status).toBe(200);
    expect((await stillThere.json()).name).toBe("Private habit");
  });

  it("serves analytics from real logs and requires auth", async () => {
    const { cookie } = await registerUser();
    const habit = await createHabit(cookie, "Analytics habit");

    await logsRoute.POST(
      jsonRequest(
        "/api/habit-logs",
        {
          habitId: habit._id,
          localDate: today(),
          timezone: "UTC",
          status: "completed",
          trackingType: "boolean",
        },
        { cookie }
      )
    );

    const anonymous = await analyticsRoute.GET(api("/api/analytics?section=overview"));
    expect(anonymous.status).toBe(401);

    const res = await analyticsRoute.GET(
      api("/api/analytics?section=overview&timezone=UTC", { headers: { cookie } })
    );
    expect(res.status).toBe(200);
    const overview = await res.json();
    expect(overview.totalActiveHabits).toBe(1);
    expect(overview.completedToday).toBe(1);
    expect(overview.dailyCompletionRate).toBe(100);
  });
});
