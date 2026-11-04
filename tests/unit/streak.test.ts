import { describe, expect, it } from "vitest";
import {
  isValidLocalDate,
  localDateString,
  localDateBounds,
  isScheduledDate,
  progressPercent,
} from "@/services/streak.service";

describe("isValidLocalDate", () => {
  it("accepts real YYYY-MM-DD dates", () => {
    expect(isValidLocalDate("2024-01-01")).toBe(true);
    expect(isValidLocalDate("2024-02-29")).toBe(true);
    expect(isValidLocalDate("2025-12-31")).toBe(true);
  });

  it("rejects malformed or impossible dates", () => {
    expect(isValidLocalDate("2024-2-1")).toBe(false);
    expect(isValidLocalDate("2024-02-30")).toBe(false);
    expect(isValidLocalDate("2023-02-29")).toBe(false);
    expect(isValidLocalDate("not-a-date")).toBe(false);
    expect(isValidLocalDate("")).toBe(false);
  });
});

describe("localDateString", () => {
  it("formats UTC instants in UTC", () => {
    expect(localDateString(new Date("2024-06-15T12:00:00Z"), "UTC")).toBe("2024-06-15");
  });

  it("respects the user timezone across midnight", () => {
    const instant = new Date("2024-06-15T02:30:00Z");
    expect(localDateString(instant, "UTC")).toBe("2024-06-15");
    expect(localDateString(instant, "America/New_York")).toBe("2024-06-14");
    expect(localDateString(instant, "Asia/Tokyo")).toBe("2024-06-15");
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(localDateString(new Date("2024-06-15T12:00:00Z"), "Not/AZone")).toBe("2024-06-15");
  });
});

describe("localDateBounds", () => {
  it("returns an inclusive UTC day", () => {
    const { start, end } = localDateBounds("2024-01-15", "UTC");
    expect(start.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-01-15T23:59:59.999Z");
  });

  it("handles a positive UTC offset", () => {
    const { start, end } = localDateBounds("2024-01-15", "Asia/Kolkata");
    expect(start.toISOString()).toBe("2024-01-14T18:30:00.000Z");
    expect(end.toISOString()).toBe("2024-01-15T18:29:59.999Z");
  });

  it("handles DST transitions", () => {
    const { start, end } = localDateBounds("2024-03-10", "America/New_York");
    expect(start.toISOString()).toBe("2024-03-10T05:00:00.000Z");
    expect(end.toISOString()).toBe("2024-03-11T03:59:59.999Z");
  });

  it("throws for invalid input", () => {
    expect(() => localDateBounds("2024-02-30", "UTC")).toThrow();
  });
});

describe("isScheduledDate", () => {
  const base = { startDate: new Date("2024-01-01T00:00:00Z") };

  it("schedules daily habits every day", () => {
    const habit = { ...base, frequency: "daily" };
    expect(isScheduledDate(habit, "2024-01-01")).toBe(true);
    expect(isScheduledDate(habit, "2024-01-06")).toBe(true);
  });

  it("schedules weekday habits Monday to Friday", () => {
    const habit = { ...base, frequency: "weekdays" };
    expect(isScheduledDate(habit, "2024-01-01")).toBe(true); // Monday
    expect(isScheduledDate(habit, "2024-01-06")).toBe(false); // Saturday
    expect(isScheduledDate(habit, "2024-01-07")).toBe(false); // Sunday
  });

  it("uses explicit weekdays for weekly habits", () => {
    const habit = { ...base, frequency: "weekly", weekdays: [1, 3] };
    expect(isScheduledDate(habit, "2024-01-01")).toBe(true); // Monday
    expect(isScheduledDate(habit, "2024-01-02")).toBe(false); // Tuesday
    expect(isScheduledDate(habit, "2024-01-03")).toBe(true); // Wednesday
  });

  it("schedules monthly habits on the start day of month", () => {
    const habit = { ...base, frequency: "monthly", startDate: new Date("2024-01-15T00:00:00Z") };
    expect(isScheduledDate(habit, "2024-02-15")).toBe(true);
    expect(isScheduledDate(habit, "2024-02-16")).toBe(false);
  });

  it("respects custom intervals", () => {
    const habit = { ...base, frequency: "custom", intervalDays: 3 };
    expect(isScheduledDate(habit, "2024-01-01")).toBe(true);
    expect(isScheduledDate(habit, "2024-01-02")).toBe(false);
    expect(isScheduledDate(habit, "2024-01-04")).toBe(true);
  });

  it("respects start and end dates", () => {
    const habit = {
      frequency: "daily",
      startDate: new Date("2024-01-10T00:00:00Z"),
      endDate: new Date("2024-01-20T00:00:00Z"),
    };
    expect(isScheduledDate(habit, "2024-01-09")).toBe(false);
    expect(isScheduledDate(habit, "2024-01-10")).toBe(true);
    expect(isScheduledDate(habit, "2024-01-20")).toBe(true);
    expect(isScheduledDate(habit, "2024-01-21")).toBe(false);
  });

  it("returns false for invalid dates or missing habit", () => {
    expect(isScheduledDate(null, "2024-01-01")).toBe(false);
    expect(isScheduledDate({ frequency: "daily" }, "2024-13-01")).toBe(false);
  });
});

describe("progressPercent", () => {
  it("handles boolean and negative habits", () => {
    expect(progressPercent("boolean", { status: "completed" })).toBe(100);
    expect(progressPercent("boolean", { status: "missed" })).toBe(0);
    expect(progressPercent("negative", { negativeHabitLog: { avoided: true } })).toBe(100);
    expect(progressPercent("negative", { negativeHabitLog: { avoided: false } })).toBe(0);
  });

  it("handles numeric, duration and checklist progress", () => {
    expect(progressPercent("numeric", { numericProgress: { value: 5, target: 10 } })).toBe(50);
    expect(progressPercent("duration", { durationProgress: { minutes: 10, targetMinutes: 40 } })).toBe(25);
    expect(
      progressPercent("checklist", {
        checklistProgress: {
          items: [
            { id: "a", checked: true },
            { id: "b", checked: false },
          ],
          requiredCount: 2,
        },
      })
    ).toBe(50);
  });

  it("clamps and handles missing data", () => {
    expect(progressPercent("numeric", { numericProgress: { value: 20, target: 10 } })).toBe(100);
    expect(progressPercent("numeric", { numericProgress: { value: -5, target: 10 } })).toBe(0);
    expect(progressPercent("numeric", null)).toBe(0);
    expect(progressPercent("count", {})).toBe(0);
  });
});
