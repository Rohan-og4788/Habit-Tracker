import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
  createHabitSchema,
  recordLogSchema,
  journalSchema,
} from "@/lib/validations";

describe("registerSchema", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ADA@Example.com",
    password: "Str0ng!Pass",
  };

  it("accepts valid input and normalises the email", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "alllowercase1!" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "NoNumber!" }).success).toBe(false);
  });

  it("rejects invalid emails and short names", () => {
    expect(registerSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires an email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});

describe("createHabitSchema", () => {
  it("applies defaults", () => {
    const parsed = createHabitSchema.parse({ name: "Read" });
    expect(parsed.frequency).toBe("daily");
    expect(parsed.trackingType).toBe("boolean");
    expect(parsed.category).toBe("other");
    expect(parsed.weekdays).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects invalid enums and weekday values", () => {
    expect(createHabitSchema.safeParse({ name: "Read", frequency: "hourly" }).success).toBe(false);
    expect(createHabitSchema.safeParse({ name: "Read", weekdays: [7] }).success).toBe(false);
    expect(createHabitSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("parses start and end dates", () => {
    const parsed = createHabitSchema.parse({
      name: "Read",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.endDate).toBeInstanceOf(Date);
  });
});

describe("recordLogSchema", () => {
  const base = {
    habitId: "habit_1",
    localDate: "2024-06-15",
    timezone: "UTC",
    status: "completed",
    trackingType: "boolean",
  };

  it("accepts a valid log", () => {
    expect(recordLogSchema.safeParse(base).success).toBe(true);
  });

  it("rejects malformed dates and statuses", () => {
    expect(recordLogSchema.safeParse({ ...base, localDate: "15-06-2024" }).success).toBe(false);
    expect(recordLogSchema.safeParse({ ...base, status: "done" }).success).toBe(false);
  });
});

describe("journalSchema", () => {
  it("defaults mood and validates the date", () => {
    const parsed = journalSchema.parse({ date: "2024-06-15" });
    expect(parsed.mood).toBe("neutral");
    expect(journalSchema.safeParse({ date: "2024/06/15" }).success).toBe(false);
  });
});
