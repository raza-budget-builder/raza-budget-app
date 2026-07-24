export type PeriodKey =
  | "this-week"
  | "this-month"
  | "last-30-days"
  | "last-month"
  | "last-6-months"
  | "this-year"
  | "last-365-days"
  | "previous-year";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-month", label: "Last month" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
  { value: "last-365-days", label: "Last 365 days" },
  { value: "previous-year", label: "Previous year" },
];

export const DEFAULT_PERIOD: PeriodKey = "this-month";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPeriodRange(
  period: PeriodKey,
  today: Date = new Date(),
): { start: string; end: string } {
  switch (period) {
    case "this-week": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { start: toISODate(start), end: toISODate(today) };
    }
    case "this-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toISODate(start), end: toISODate(today) };
    }
    case "last-30-days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: toISODate(start), end: toISODate(today) };
    }
    case "last-month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toISODate(start), end: toISODate(end) };
    }
    case "last-6-months": {
      const start = new Date(
        today.getFullYear(),
        today.getMonth() - 6,
        today.getDate(),
      );
      return { start: toISODate(start), end: toISODate(today) };
    }
    case "this-year": {
      // Full calendar year, including transactions already entered with a
      // future date (e.g. next month) — not bounded by today.
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: toISODate(start), end: toISODate(end) };
    }
    case "last-365-days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 364);
      return { start: toISODate(start), end: toISODate(today) };
    }
    case "previous-year": {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { start: toISODate(start), end: toISODate(end) };
    }
  }
}
