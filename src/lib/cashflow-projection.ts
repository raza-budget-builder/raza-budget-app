// Pure calculation logic for the Insights "Cash Flow Forecast" card — no AI
// call. Walks forward day-by-day from today, starting at the same
// cumulative balance NetFlowChart's "Your Savings Journey" hero shows,
// adding/subtracting each known recurring transaction on its real due date,
// and subtracting a smoothed daily rate for everything else (groceries,
// dining, any expense that isn't part of a recurring series) so a category
// with a real future due date isn't also folded into the average and
// double-counted. Every dollar that actually moves is included regardless
// of budget_group — the "excluded" categories (Business Expenses, Taxes,
// ...) are excluded from the *personal-savings* framing elsewhere in the
// app (net-flow.ts's cumulative total), but they still leave/enter a real
// account, and this card's whole point is predicting tightness, not
// personal savings.

const MS_PER_DAY = 1000 * 60 * 60 * 24;
// Rolling window for the smoothed daily rate — day-granular (not calendar
// months, unlike drift-alerts.ts/dashboard-insights.ts) since this
// projection itself works in days.
const IRREGULAR_SPEND_WINDOW_DAYS = 90;
// Below this many days of history, a daily average is too thin a sample to
// project forward with any confidence.
const MIN_HISTORY_DAYS = 14;

export const HORIZON_OPTIONS_DAYS = [30, 60] as const;
export type HorizonDays = (typeof HORIZON_OPTIONS_DAYS)[number];

export type RecurringOccurrence = {
  groupId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string; // YYYY-MM-DD
};

export type CashFlowPoint = {
  date: string;
  daysFromToday: number;
  balance: number;
};

export type CashFlowForecast = {
  points: CashFlowPoint[];
  startingBalance: number;
  dailyIrregularSpend: number;
  lowestPoint: CashFlowPoint;
  // First date the projected balance dips below $0, or null if it never
  // does within the horizon.
  tightDate: string | null;
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Null return means "not enough history yet" — the card shows an empty
// state rather than projecting off a handful of days of data.
export function computeDailyIrregularSpend(
  transactions: {
    date: string;
    amount: number;
    type: "income" | "expense";
    recurringGroupId: string | null;
  }[],
  today: Date = new Date(),
): number | null {
  if (transactions.length === 0) return null;

  const todayISO = toISODate(today);
  const earliestDate = transactions.reduce((min, t) => (t.date < min ? t.date : min), todayISO);
  const historyDays = Math.floor(
    (new Date(`${todayISO}T00:00:00`).getTime() - new Date(`${earliestDate}T00:00:00`).getTime()) /
      MS_PER_DAY,
  );
  if (historyDays < MIN_HISTORY_DAYS) return null;

  // Ends yesterday, not today — today's spending is still accumulating and
  // isn't a fair full day to average in, same "exclude the in-progress
  // period" convention computeIllustrativeSavingsRate uses for months.
  // [windowStart, todayISO) is exactly IRREGULAR_SPEND_WINDOW_DAYS days.
  const windowStart = addDays(todayISO, -IRREGULAR_SPEND_WINDOW_DAYS);
  const total = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.recurringGroupId === null &&
        t.date >= windowStart &&
        t.date < todayISO,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
  return total / IRREGULAR_SPEND_WINDOW_DAYS;
}

// recurringOccurrences may cover a wider window than horizonDays (the
// caller fetches once at the largest horizon offered and this filters down)
// — anything past the requested horizon is simply ignored.
export function computeCashFlowForecast({
  startingBalance,
  dailyIrregularSpend,
  recurringOccurrences,
  horizonDays,
  today = new Date(),
}: {
  startingBalance: number;
  dailyIrregularSpend: number;
  recurringOccurrences: RecurringOccurrence[];
  horizonDays: HorizonDays;
  today?: Date;
}): CashFlowForecast {
  const todayISO = toISODate(today);
  const horizonEnd = addDays(todayISO, horizonDays);

  const deltaByDate = new Map<string, number>();
  for (const occ of recurringOccurrences) {
    if (occ.date > horizonEnd) continue;
    const delta = occ.type === "income" ? Number(occ.amount) : -Number(occ.amount);
    deltaByDate.set(occ.date, (deltaByDate.get(occ.date) ?? 0) + delta);
  }

  const points: CashFlowPoint[] = [{ date: todayISO, daysFromToday: 0, balance: startingBalance }];
  let lowestPoint = points[0];
  let tightDate: string | null = startingBalance < 0 ? todayISO : null;

  let balance = startingBalance;
  for (let day = 1; day <= horizonDays; day++) {
    const date = addDays(todayISO, day);
    balance += (deltaByDate.get(date) ?? 0) - dailyIrregularSpend;
    const point: CashFlowPoint = { date, daysFromToday: day, balance };
    points.push(point);
    if (balance < lowestPoint.balance) lowestPoint = point;
    if (tightDate === null && balance < 0) tightDate = date;
  }

  return { points, startingBalance, dailyIrregularSpend, lowestPoint, tightDate };
}

export function formatCashFlowSentence(forecast: CashFlowForecast, horizonDays: HorizonDays): string {
  if (forecast.tightDate) {
    const day = new Date(`${forecast.tightDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return (
      `Your balance is projected to dip below $0 around ${day}, based on known bills and ` +
      `your typical spending.`
    );
  }
  const lowest = Math.round(forecast.lowestPoint.balance).toLocaleString("en-US");
  return (
    `Your balance is projected to stay above $${lowest} over the next ${horizonDays} days, ` +
    `based on known bills and your typical spending.`
  );
}
