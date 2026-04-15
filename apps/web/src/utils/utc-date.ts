export function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromUtcDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function getUtcDayIndex(date: Date, epochUtcDateKey = "2026-01-01"): number {
  const epoch = fromUtcDateKey(epochUtcDateKey).getTime();
  const target = fromUtcDateKey(toUtcDateKey(date)).getTime();
  return Math.floor((target - epoch) / 86400000);
}

export function getUtcWeekdayShort(date: Date): string {
  const days = ["Su", "M", "T", "W", "Th", "F", "S"];
  return days[date.getUTCDay()];
}

