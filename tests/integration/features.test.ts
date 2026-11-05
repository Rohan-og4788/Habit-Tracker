import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replset: MongoMemoryReplSet;

let registerRoute: typeof import("@/app/api/auth/register/route");
let loginRoute: typeof import("@/app/api/auth/login/route");
let meRoute: typeof import("@/app/api/auth/me/route");
let habitsRoute: typeof import("@/app/api/habits/route");
let habitIdRoute: typeof import("@/app/api/habits/[id]/route");
let logsRoute: typeof import("@/app/api/habit-logs/route");
let goalsRoute: typeof import("@/app/api/goals/route");
let goalRoute: typeof import("@/app/api/goals/[id]/route");
let journalRoute: typeof import("@/app/api/journal/route");
let journalIdRoute: typeof import("@/app/api/journal/[id]/route");
let focusRoute: typeof import("@/app/api/focus-sessions/route");
let focusIdRoute: typeof import("@/app/api/focus-sessions/[id]/route");
let tasksRoute: typeof import("@/app/api/daily-tasks/route");
let taskIdRoute: typeof import("@/app/api/daily-tasks/[id]/route");
let challengesRoute: typeof import("@/app/api/challenges/route");
let challengeIdRoute: typeof import("@/app/api/challenges/[id]/route");
let checkInRoute: typeof import("@/app/api/challenges/[id]/check-in/route");
let settingsRoute: typeof import("@/app/api/settings/route");
let notificationsRoute: typeof import("@/app/api/notifications/route");
let pushKeyRoute: typeof import("@/app/api/notifications/push-key/route");
let exportRoute: typeof import("@/app/api/export/route");
let accountRoute: typeof import("@/app/api/account/route");
let passwordRoute: typeof import("@/app/api/account/password/route");
let achievementsRoute: typeof import("@/app/api/achievements/route");
let reportsRoute: typeof import("@/app/api/reports/route");
let subscriptionRoute: typeof import("@/app/api/subscription/route");
let aiRoute: typeof import("@/app/api/ai/coach/route");
let cronRoute: typeof import("@/app/api/cron/reminders/route");
let inboxRoute: typeof import("@/app/api/notifications/inbox/route");
let inboxIdRoute: typeof import("@/app/api/notifications/inbox/[id]/route");
let inboxReadAllRoute: typeof import("@/app/api/notifications/inbox/read-all/route");

let ipSeq = 0;
const PASSWORD = "Str0ng!Pass";

function nextIp(): string {
  ipSeq += 1;
  return `10.20.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`;
}

function api(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST"
): Request {
  return api(path, {
    method,
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

async function registerUser() {
  const email = `feature${Date.now()}${ipSeq}@example.com`;
  const res = await registerRoute.POST(
    jsonRequest(
      "/api/auth/register",
      { name: "Feature User", email, password: PASSWORD, timezone: "UTC" },
      { "x-forwarded-for": nextIp() }
    )
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  return { cookie: cookieHeader(res), userId: body.user.id as string, email };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function createHabit(cookie: string, name = "Feature habit") {
  const res = await habitsRoute.POST(
    jsonRequest("/api/habits", { name, trackingType: "boolean", frequency: "daily" }, { cookie })
  );
  expect(res.status).toBe(201);
  return res.json();
}

async function createLog(cookie: string, habitId: string, localDate = today()) {
  const res = await logsRoute.POST(
    jsonRequest(
      "/api/habit-logs",
      { habitId, localDate, timezone: "UTC", status: "completed", trackingType: "boolean" },
      { cookie }
    )
  );
  expect(res.status).toBe(201);
  return res.json();
}

async function clearDatabase() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

beforeAll(async () => {
  // Optional integrations must be unset so the "disabled-safe" paths are tested.
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_PRO;
  delete process.env.AI_API_KEY;
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.CRON_SECRET;

  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = replset.getUri();
  process.env.MONGODB_DB_NAME = "habitforge_features_integration";

  vi.resetModules();
  delete (global as any).mongoose;

  registerRoute = await import("@/app/api/auth/register/route");
  loginRoute = await import("@/app/api/auth/login/route");
  meRoute = await import("@/app/api/auth/me/route");
  habitsRoute = await import("@/app/api/habits/route");
  habitIdRoute = await import("@/app/api/habits/[id]/route");
  logsRoute = await import("@/app/api/habit-logs/route");
  goalsRoute = await import("@/app/api/goals/route");
  goalRoute = await import("@/app/api/goals/[id]/route");
  journalRoute = await import("@/app/api/journal/route");
  journalIdRoute = await import("@/app/api/journal/[id]/route");
  focusRoute = await import("@/app/api/focus-sessions/route");
  focusIdRoute = await import("@/app/api/focus-sessions/[id]/route");
  tasksRoute = await import("@/app/api/daily-tasks/route");
  taskIdRoute = await import("@/app/api/daily-tasks/[id]/route");
  challengesRoute = await import("@/app/api/challenges/route");
  challengeIdRoute = await import("@/app/api/challenges/[id]/route");
  checkInRoute = await import("@/app/api/challenges/[id]/check-in/route");
  settingsRoute = await import("@/app/api/settings/route");
  notificationsRoute = await import("@/app/api/notifications/route");
  pushKeyRoute = await import("@/app/api/notifications/push-key/route");
  exportRoute = await import("@/app/api/export/route");
  accountRoute = await import("@/app/api/account/route");
  passwordRoute = await import("@/app/api/account/password/route");
  achievementsRoute = await import("@/app/api/achievements/route");
  reportsRoute = await import("@/app/api/reports/route");
  subscriptionRoute = await import("@/app/api/subscription/route");
  aiRoute = await import("@/app/api/ai/coach/route");
  cronRoute = await import("@/app/api/cron/reminders/route");
  inboxRoute = await import("@/app/api/notifications/inbox/route");
  inboxIdRoute = await import("@/app/api/notifications/inbox/[id]/route");
  inboxReadAllRoute = await import("@/app/api/notifications/inbox/read-all/route");

  const dbConnect = (await import("@/lib/database")).default;
  await dbConnect();
  const { User } = await import("@/models/User");
  const { Habit } = await import("@/models/Habit");
  const { HabitLog } = await import("@/models/HabitLog");
  const { Goal } = await import("@/models/Goal");
  const { JournalEntry } = await import("@/models/JournalEntry");
  const { DailyTask } = await import("@/models/DailyTask");
  const { Challenge } = await import("@/models/Challenge");
  const { ChallengeProgress } = await import("@/models/ChallengeProgress");
  await Promise.all([
    User.init(),
    Habit.init(),
    HabitLog.init(),
    Goal.init(),
    JournalEntry.init(),
    DailyTask.init(),
    Challenge.init(),
    ChallengeProgress.init(),
  ]);
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

describe("feature API integration", () => {
  it("supports the full goal lifecycle and blocks cross-user access", async () => {
    const { cookie } = await registerUser();
    const other = await registerUser();

    const created = await goalsRoute.POST(
      jsonRequest(
        "/api/goals",
        { title: "Walk 100 km", targetValue: 100, unit: "km", priority: "high" },
        { cookie }
      )
    );
    expect(created.status).toBe(201);
    const goal = await created.json();

    const list = await goalsRoute.GET(api("/api/goals", { headers: { cookie } }));
    expect(list.status).toBe(200);
    expect((await list.json()).goals).toHaveLength(1);

    const partial = await goalRoute.PATCH(
      jsonRequest(`/api/goals/${goal._id}`, { increment: 40 }, { cookie }, "PATCH"),
      { params: { id: goal._id } }
    );
    expect(partial.status).toBe(200);
    expect((await partial.json()).currentProgress).toBe(40);

    const complete = await goalRoute.PATCH(
      jsonRequest(`/api/goals/${goal._id}`, { increment: 60 }, { cookie }, "PATCH"),
      { params: { id: goal._id } }
    );
    expect(complete.status).toBe(200);
    const completed = await complete.json();
    expect(completed.currentProgress).toBe(100);
    expect(completed.status).toBe("completed");

    const strangerGet = await goalRoute.GET(
      api(`/api/goals/${goal._id}`, { headers: { cookie: other.cookie } }),
      { params: { id: goal._id } }
    );
    expect(strangerGet.status).toBe(404);

    const strangerDelete = await goalRoute.DELETE(
      api(`/api/goals/${goal._id}`, { method: "DELETE", headers: { cookie: other.cookie } }),
      { params: { id: goal._id } }
    );
    expect(strangerDelete.status).toBe(404);

    const removed = await goalRoute.DELETE(
      api(`/api/goals/${goal._id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: goal._id } }
    );
    expect(removed.status).toBe(200);
  });

  it("upserts one journal entry per date and supports update/delete", async () => {
    const { cookie } = await registerUser();
    const date = today();

    const first = await journalRoute.POST(
      jsonRequest(
        "/api/journal",
        { date, wentWell: "Morning walk", mood: "good" },
        { cookie }
      )
    );
    expect(first.status).toBe(201);
    const entry = await first.json();

    const second = await journalRoute.POST(
      jsonRequest(
        "/api/journal",
        { date, wentWell: "Morning walk", mood: "excellent", learned: "Sleep matters" },
        { cookie }
      )
    );
    expect(second.status).toBe(201);
    const updated = await second.json();
    expect(updated._id).toBe(entry._id);
    expect(updated.mood).toBe("excellent");

    const list = await journalRoute.GET(api("/api/journal", { headers: { cookie } }));
    expect((await list.json()).entries).toHaveLength(1);

    const byDate = await journalIdRoute.GET(
      api(`/api/journal/${date}`, { headers: { cookie } }),
      { params: { id: date } }
    );
    expect(byDate.status).toBe(200);

    const patched = await journalIdRoute.PATCH(
      jsonRequest(`/api/journal/${date}`, { notes: "Reflection" }, { cookie }, "PATCH"),
      { params: { id: date } }
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).notes).toBe("Reflection");

    const deleted = await journalIdRoute.DELETE(
      api(`/api/journal/${date}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: date } }
    );
    expect(deleted.status).toBe(200);

    const missing = await journalIdRoute.GET(
      api(`/api/journal/${date}`, { headers: { cookie } }),
      { params: { id: date } }
    );
    expect(missing.status).toBe(404);
  });

  it("persists focus sessions and validates input", async () => {
    const { cookie } = await registerUser();

    const invalid = await focusRoute.POST(
      jsonRequest("/api/focus-sessions", { plannedMinutes: 0 }, { cookie })
    );
    expect(invalid.status).toBe(400);

    const created = await focusRoute.POST(
      jsonRequest("/api/focus-sessions", { plannedMinutes: 25 }, { cookie })
    );
    expect(created.status).toBe(201);
    const session = await created.json();

    const updated = await focusIdRoute.PATCH(
      jsonRequest(
        `/api/focus-sessions/${session._id}`,
        { actualMinutes: 25, completed: true },
        { cookie },
        "PATCH"
      ),
      { params: { id: session._id } }
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).completed).toBe(true);

    const list = await focusRoute.GET(
      api("/api/focus-sessions", { headers: { cookie } })
    );
    expect((await list.json()).sessions).toHaveLength(1);

    const deleted = await focusIdRoute.DELETE(
      api(`/api/focus-sessions/${session._id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
      { params: { id: session._id } }
    );
    expect(deleted.status).toBe(200);

    const again = await focusIdRoute.DELETE(
      api(`/api/focus-sessions/${session._id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
      { params: { id: session._id } }
    );
    expect(again.status).toBe(404);
  });

  it("manages daily tasks, reordering and validation", async () => {
    const { cookie } = await registerUser();
    const other = await registerUser();
    const date = today();

    const firstRes = await tasksRoute.POST(
      jsonRequest("/api/daily-tasks", { title: "First task", date }, { cookie })
    );
    expect(firstRes.status).toBe(201);
    const first = await firstRes.json();

    const secondRes = await tasksRoute.POST(
      jsonRequest("/api/daily-tasks", { title: "Second task", date }, { cookie })
    );
    expect(secondRes.status).toBe(201);
    const second = await secondRes.json();

    const list = await tasksRoute.GET(
      api(`/api/daily-tasks?date=${date}`, { headers: { cookie } })
    );
    expect((await list.json()).tasks).toHaveLength(2);

    const completed = await taskIdRoute.PATCH(
      jsonRequest(`/api/daily-tasks/${first._id}`, { status: "completed" }, { cookie }, "PATCH"),
      { params: { id: first._id } }
    );
    expect(completed.status).toBe(200);
    expect((await completed.json()).status).toBe("completed");

    const invalidDate = await taskIdRoute.PATCH(
      jsonRequest(`/api/daily-tasks/${first._id}`, { date: "not-a-date" }, { cookie }, "PATCH"),
      { params: { id: first._id } }
    );
    expect(invalidDate.status).toBe(400);

    const reordered = await tasksRoute.PATCH(
      jsonRequest(
        "/api/daily-tasks",
        { date, orderedIds: [second._id, first._id] },
        { cookie },
        "PATCH"
      )
    );
    expect(reordered.status).toBe(200);
    expect((await reordered.json()).tasks[0]._id).toBe(second._id);

    const stranger = await taskIdRoute.PATCH(
      jsonRequest(`/api/daily-tasks/${first._id}`, { title: "Hijacked" }, { cookie: other.cookie }, "PATCH"),
      { params: { id: first._id } }
    );
    expect(stranger.status).toBe(404);

    const deleted = await taskIdRoute.DELETE(
      api(`/api/daily-tasks/${first._id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: first._id } }
    );
    expect(deleted.status).toBe(200);

    const again = await taskIdRoute.DELETE(
      api(`/api/daily-tasks/${first._id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: first._id } }
    );
    expect(again.status).toBe(404);
  });

  it("runs a challenge with idempotent check-ins and window validation", async () => {
    const { cookie } = await registerUser();

    const created = await challengesRoute.POST(
      jsonRequest(
        "/api/challenges",
        {
          title: "7-day challenge",
          startDate: today(),
          endDate: daysFromToday(7),
        },
        { cookie }
      )
    );
    expect(created.status).toBe(201);
    const challenge = await created.json();

    const checkIn = await checkInRoute.POST(
      jsonRequest(`/api/challenges/${challenge._id}/check-in`, { completed: true }, { cookie }),
      { params: { id: challenge._id } }
    );
    expect(checkIn.status).toBe(201);
    const progress = await checkIn.json();

    const repeat = await checkInRoute.POST(
      jsonRequest(
        `/api/challenges/${challenge._id}/check-in`,
        { completed: true, value: 2 },
        { cookie }
      ),
      { params: { id: challenge._id } }
    );
    expect(repeat.status).toBe(201);
    expect((await repeat.json())._id).toBe(progress._id);

    const list = await challengesRoute.GET(
      api("/api/challenges", { headers: { cookie } })
    );
    const listed = await list.json();
    expect(listed.challenges).toHaveLength(1);
    expect(listed.challenges[0].completedDays).toBe(1);

    const outside = await checkInRoute.POST(
      jsonRequest(
        `/api/challenges/${challenge._id}/check-in`,
        { localDate: daysFromToday(30) },
        { cookie }
      ),
      { params: { id: challenge._id } }
    );
    expect(outside.status).toBe(400);

    const missingId = new mongoose.Types.ObjectId().toString();
    const missing = await checkInRoute.POST(
      jsonRequest(`/api/challenges/${missingId}/check-in`, {}, { cookie }),
      { params: { id: missingId } }
    );
    expect(missing.status).toBe(404);

    const patched = await challengeIdRoute.PATCH(
      jsonRequest(`/api/challenges/${challenge._id}`, { title: "Renamed" }, { cookie }, "PATCH"),
      { params: { id: challenge._id } }
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).title).toBe("Renamed");

    const deleted = await challengeIdRoute.DELETE(
      api(`/api/challenges/${challenge._id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: challenge._id } }
    );
    expect(deleted.status).toBe(200);

    const again = await challengeIdRoute.DELETE(
      api(`/api/challenges/${challenge._id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: challenge._id } }
    );
    expect(again.status).toBe(404);
  });

  it("creates and updates user settings", async () => {
    const { cookie } = await registerUser();

    const initial = await settingsRoute.GET(api("/api/settings", { headers: { cookie } }));
    expect(initial.status).toBe(200);
    expect((await initial.json()).weekStartDay).toBe(1);

    const patched = await settingsRoute.PATCH(
      jsonRequest("/api/settings", { weekStartDay: 0, highContrast: true }, { cookie }, "PATCH")
    );
    expect(patched.status).toBe(200);

    const after = await settingsRoute.GET(api("/api/settings", { headers: { cookie } }));
    const settings = await after.json();
    expect(settings.weekStartDay).toBe(0);
    expect(settings.highContrast).toBe(true);
  });

  it("uses an allow-list for notification preferences and gates push", async () => {
    const { cookie, userId } = await registerUser();

    const initial = await notificationsRoute.GET(
      api("/api/notifications", { headers: { cookie } })
    );
    expect(initial.status).toBe(200);

    const patched = await notificationsRoute.PATCH(
      jsonRequest(
        "/api/notifications",
        { pushEnabled: false, userId: "attacker", emailEnabled: false },
        { cookie },
        "PATCH"
      )
    );
    expect(patched.status).toBe(200);

    const after = await notificationsRoute.GET(
      api("/api/notifications", { headers: { cookie } })
    );
    const prefs = await after.json();
    expect(prefs.pushEnabled).toBe(false);
    expect(prefs.emailEnabled).toBe(false);
    expect(String(prefs.userId)).toBe(userId);

    const pushKey = await pushKeyRoute.GET(
      api("/api/notifications/push-key", { headers: { cookie } })
    );
    expect(pushKey.status).toBe(200);
    expect((await pushKey.json()).configured).toBe(false);

    const push = await notificationsRoute.POST(
      jsonRequest(
        "/api/notifications",
        { endpoint: "https://push.example/abc", keys: { p256dh: "x", auth: "y" } },
        { cookie }
      )
    );
    expect(push.status).toBe(503);
  });

  it("exports JSON and CSV without credentials", async () => {
    const { cookie } = await registerUser();
    const habit = await createHabit(cookie, "Export habit");
    await createLog(cookie, habit._id);

    const jsonRes = await exportRoute.GET(
      api("/api/export?format=json", { headers: { cookie } })
    );
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-disposition")).toContain("attachment");
    const data = await jsonRes.json();
    expect(data.habits).toHaveLength(1);
    expect(data.habitLogs).toHaveLength(1);
    expect(data.user.email).toBeTruthy();
    expect(data.user.passwordHash).toBeUndefined();

    const csvRes = await exportRoute.GET(
      api("/api/export?format=csv", { headers: { cookie } })
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    const csv = await csvRes.text();
    expect(csv.split("\n")[0]).toContain("localDate,habit,status");
    expect(csv).toContain("Export habit");
  });

  it("updates the profile, changes the password and cascades account deletion", async () => {
    const { cookie, email } = await registerUser();
    const userId = (await (
      await meRoute.GET(api("/api/auth/me", { headers: { cookie } }))
    ).json()).user.id;

    const profile = await accountRoute.PATCH(
      jsonRequest(
        "/api/account",
        { name: "Renamed User", bio: "Building habits", timezone: "Europe/London" },
        { cookie },
        "PATCH"
      )
    );
    expect(profile.status).toBe(200);
    const updated = await profile.json();
    expect(updated.user.name).toBe("Renamed User");
    expect(updated.user.timezone).toBe("Europe/London");

    const wrong = await passwordRoute.POST(
      jsonRequest(
        "/api/account/password",
        { currentPassword: "WrongPass1!", newPassword: "NewStr0ng!Pass" },
        { cookie }
      )
    );
    expect(wrong.status).toBe(400);

    const changed = await passwordRoute.POST(
      jsonRequest(
        "/api/account/password",
        { currentPassword: PASSWORD, newPassword: "NewStr0ng!Pass" },
        { cookie }
      )
    );
    expect(changed.status).toBe(200);

    const login = await loginRoute.POST(
      jsonRequest(
        "/api/auth/login",
        { email, password: "NewStr0ng!Pass" },
        { "x-forwarded-for": nextIp() }
      )
    );
    expect(login.status).toBe(200);
    const newCookie = cookieHeader(login);

    // Logging in again must invalidate the previous session (fixation defense).
    const oldSession = await meRoute.GET(api("/api/auth/me", { headers: { cookie } }));
    expect(oldSession.status).toBe(401);

    const withoutConfirm = await accountRoute.DELETE(
      api("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json", cookie: newCookie },
        body: JSON.stringify({ confirm: "nope" }),
      })
    );
    expect(withoutConfirm.status).toBe(400);

    const deleted = await accountRoute.DELETE(
      api("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json", cookie: newCookie },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
    );
    expect(deleted.status).toBe(200);

    const after = await meRoute.GET(api("/api/auth/me", { headers: { cookie: newCookie } }));
    expect(after.status).toBe(401);

    const { User } = await import("@/models/User");
    const { Habit } = await import("@/models/Habit");
    const { Session } = await import("@/models/Session");
    expect(await User.countDocuments({ _id: userId })).toBe(0);
    expect(await Habit.countDocuments({ userId })).toBe(0);
    expect(await Session.countDocuments({ userId })).toBe(0);
  });

  it("serves achievements, reports, subscription and AI without credentials", async () => {
    const { cookie } = await registerUser();
    const habit = await createHabit(cookie, "Reporting habit");
    await createLog(cookie, habit._id);

    const achievements = await achievementsRoute.GET(
      api("/api/achievements", { headers: { cookie } })
    );
    expect(achievements.status).toBe(200);
    const achievementData = await achievements.json();
    expect(achievementData.totalCount).toBeGreaterThan(0);
    expect(achievementData.unlockedCount).toBeGreaterThanOrEqual(1);

    const report = await reportsRoute.GET(
      api("/api/reports?days=7", { headers: { cookie } })
    );
    expect(report.status).toBe(200);
    const reportData = await report.json();
    expect(reportData.daily).toHaveLength(7);
    expect(reportData.completed).toBeGreaterThanOrEqual(1);

    const subscription = await subscriptionRoute.GET(
      api("/api/subscription", { headers: { cookie } })
    );
    expect(subscription.status).toBe(200);
    const subscriptionData = await subscription.json();
    expect(subscriptionData.subscription.plan).toBe("free");
    expect(subscriptionData.billingConfigured).toBe(false);

    const checkout = await subscriptionRoute.POST();
    expect(checkout.status).toBe(503);

    const advice = await aiRoute.POST(
      jsonRequest("/api/ai/coach", { days: 7 }, { cookie })
    );
    expect(advice.status).toBe(200);
    const adviceData = await advice.json();
    expect(adviceData.provider).toBe("local");
    expect(typeof adviceData.message).toBe("string");
  });

  it("gates the reminder cron and serves an in-app notification inbox", async () => {
    // Without CRON_SECRET the cron fails closed with setup instructions.
    const unconfigured = await cronRoute.POST(api("/api/cron/reminders", { method: "POST" }));
    expect(unconfigured.status).toBe(503);
    expect((await unconfigured.json()).error).toMatch(/CRON_SECRET/);

    process.env.CRON_SECRET = "test-cron-secret";

    const unauthorized = await cronRoute.POST(
      api("/api/cron/reminders", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      })
    );
    expect(unauthorized.status).toBe(401);

    const { cookie } = await registerUser();
    const stranger = await registerUser();

    const hour = new Date().toISOString().slice(11, 13);
    const habitRes = await habitsRoute.POST(
      jsonRequest(
        "/api/habits",
        {
          name: "Remind me daily",
          frequency: "daily",
          reminder: { enabled: true, time: `${hour}:00`, days: [] },
        },
        { cookie }
      )
    );
    expect(habitRes.status).toBe(201);
    const habit = await habitRes.json();

    const runCron = async () => {
      const res = await cronRoute.POST(
        api("/api/cron/reminders", {
          method: "POST",
          headers: { authorization: "Bearer test-cron-secret" },
        })
      );
      expect(res.status).toBe(200);
      return res.json();
    };

    let cronBody = await runCron();
    if (cronBody.created === 0) {
      // The reminder hour may have rolled over between setup and execution.
      const nextHour = new Date().toISOString().slice(11, 13);
      const patched = await habitIdRoute.PATCH(
        jsonRequest(
          `/api/habits/${habit._id}`,
          { reminder: { enabled: true, time: `${nextHour}:00`, days: [] } },
          { cookie },
          "PATCH"
        ),
        { params: { id: habit._id } }
      );
      expect(patched.status).toBe(200);
      cronBody = await runCron();
    }
    expect(cronBody.created).toBeGreaterThanOrEqual(1);

    // The inbox only ever shows the caller's own notifications.
    const inboxRes = await inboxRoute.GET(
      api("/api/notifications/inbox", { headers: { cookie } })
    );
    expect(inboxRes.status).toBe(200);
    const inboxData = await inboxRes.json();
    expect(inboxData.notifications.length).toBeGreaterThanOrEqual(1);
    expect(inboxData.unreadCount).toBe(inboxData.notifications.length);
    const first = inboxData.notifications[0];
    expect(first.title).toContain("Remind me daily");

    const strangerData = await (
      await inboxRoute.GET(api("/api/notifications/inbox", { headers: { cookie: stranger.cookie } }))
    ).json();
    expect(strangerData.notifications).toHaveLength(0);
    expect(strangerData.unreadCount).toBe(0);

    const anon = await inboxRoute.GET(api("/api/notifications/inbox"));
    expect(anon.status).toBe(401);

    // A stranger cannot flip the owner's read state (IDOR).
    const foreign = await inboxIdRoute.PATCH(
      jsonRequest(
        `/api/notifications/inbox/${first._id}`,
        { read: true },
        { cookie: stranger.cookie },
        "PATCH"
      ),
      { params: { id: first._id } }
    );
    expect(foreign.status).toBe(404);

    const badId = await inboxIdRoute.PATCH(
      jsonRequest("/api/notifications/inbox/not-an-id", { read: true }, { cookie }, "PATCH"),
      { params: { id: "not-an-id" } }
    );
    expect(badId.status).toBe(400);

    // The owner marks one as read.
    const markOne = await inboxIdRoute.PATCH(
      jsonRequest(`/api/notifications/inbox/${first._id}`, { read: true }, { cookie }, "PATCH"),
      { params: { id: first._id } }
    );
    expect(markOne.status).toBe(200);

    const afterOne = await (
      await inboxRoute.GET(api("/api/notifications/inbox", { headers: { cookie } }))
    ).json();
    expect(afterOne.unreadCount).toBe(inboxData.unreadCount - 1);

    const unreadOnly = await (
      await inboxRoute.GET(api("/api/notifications/inbox?unreadOnly=true", { headers: { cookie } }))
    ).json();
    expect(unreadOnly.notifications.some((n: any) => n._id === first._id)).toBe(false);

    const readAll = await inboxReadAllRoute.POST(
      api("/api/notifications/inbox/read-all", { method: "POST", headers: { cookie } })
    );
    expect(readAll.status).toBe(200);

    const finalInbox = await (
      await inboxRoute.GET(api("/api/notifications/inbox", { headers: { cookie } }))
    ).json();
    expect(finalInbox.unreadCount).toBe(0);

    const badLimit = await inboxRoute.GET(
      api("/api/notifications/inbox?limit=0", { headers: { cookie } })
    );
    expect(badLimit.status).toBe(400);
  });
});
