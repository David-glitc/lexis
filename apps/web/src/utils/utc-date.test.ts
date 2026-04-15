import { fromUtcDateKey, getUtcDayIndex, getUtcWeekdayShort, toUtcDateKey } from "./utc-date";

describe("utc-date utilities", () => {
  test("toUtcDateKey normalizes date to UTC key", () => {
    const date = new Date("2026-03-20T23:59:59.000Z");
    expect(toUtcDateKey(date)).toBe("2026-03-20");
  });

  test("fromUtcDateKey returns a date at midnight UTC", () => {
    const date = fromUtcDateKey("2026-04-01");
    expect(date.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  test("getUtcDayIndex is deterministic for same day", () => {
    const first = new Date("2026-05-02T01:00:00.000Z");
    const second = new Date("2026-05-02T23:00:00.000Z");
    expect(getUtcDayIndex(first)).toBe(getUtcDayIndex(second));
  });

  test("weekday short uses UTC weekday", () => {
    const date = new Date("2026-03-16T00:00:00.000Z");
    expect(getUtcWeekdayShort(date)).toBe("M");
  });
});

