// Pure calculation logic for the Dashboard's "pace projection" and "biggest
// swing" insight cards — no AI call involved, both are plain arithmetic on
// data already loaded for the page. Kept separate from drift-alerts.ts's
// computeCategoryDrift() (which groups by category *name* for the AI prompt)
// because these need the category *id* to link a card's "Adjust goal"
// action to the right budget_goals row.

import { formatDollarSigned } from "./format";

// Anything smaller than this is too small in dollar terms to be worth a
// card, even if the ratio looks dramatic — same convention as drift-alerts.ts.
const MIN_NOTABLE_AMOUNT = 20;

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string; name: string } | null;
};

type Category = { id: string; name: string; is_variable?: boolean | null };
type Goal = { category_id: string; monthly_cap: number };

function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type PaceProjection = {
  categoryId: string;
  categoryName: string;
  spentSoFar: number;
  cap: number;
  projectedTotal: number;
  // projectedTotal - cap. Positive = projected to go over; negative = under.
  overBy: number;
  daysElapsed: number;
  daysInMonth: number;
};

// For each category with a budget goal, projects this month's total spend
// by extrapolating "spend so far / days elapsed" across the full month.
// Sorted most-over-pace first, so a caller showing just one card gets the
// most urgent one by default. Only runs for categories explicitly marked
// `is_variable: true` — a "pace toward month-end" projection doesn't mean
// anything for a fixed/committed expense like Rent/Mortgage, which is the
// same known amount every month. Deliberately inclusion-based (skip unless
// true, not skip-if-false): a category that hasn't been classified yet
// (is_variable is null/undefined) is excluded by default, so a newly added
// category never gets a nonsensical projection just because no one set its
// classification yet.
export function computePaceProjections(
  transactions: Transaction[],
  goals: Goal[],
  categories: Category[],
  today: Date = new Date(),
): PaceProjection[] {
  const monthPrefix = today.toISOString().slice(0, 7);
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const spendByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category || !t.date.startsWith(monthPrefix)) continue;
    spendByCategory.set(
      t.category.id,
      (spendByCategory.get(t.category.id) ?? 0) + Number(t.amount),
    );
  }

  const projections: PaceProjection[] = [];
  for (const g of goals) {
    const category = categoryById.get(g.category_id);
    if (!category || category.is_variable !== true) continue;

    const spentSoFar = spendByCategory.get(g.category_id) ?? 0;
    const projectedTotal = (spentSoFar / Math.max(1, daysElapsed)) * daysInMonth;

    projections.push({
      categoryId: g.category_id,
      categoryName: category.name,
      spentSoFar,
      cap: g.monthly_cap,
      projectedTotal,
      overBy: projectedTotal - g.monthly_cap,
      daysElapsed,
      daysInMonth,
    });
  }

  projections.sort((a, b) => b.overBy - a.overBy);
  return projections;
}

export function formatPaceSentence(p: PaceProjection): string {
  const projected = Math.round(p.projectedTotal).toLocaleString("en-US");
  const cap = Math.round(p.cap).toLocaleString("en-US");
  if (p.overBy > 0) {
    const over = Math.round(p.overBy).toLocaleString("en-US");
    return `On track to hit $${projected} in ${p.categoryName} by month-end — about $${over} over your $${cap} goal.`;
  }
  return `On track to land around $${projected} in ${p.categoryName} this month, comfortably under your $${cap} goal.`;
}

// Same PaceProjection data as the pace slide, but framed as plain progress
// ("where do things stand") rather than a month-end projection — a
// different angle on a (usually different) goal for the tracking slide.
export function formatGoalTrackingSentence(p: PaceProjection): string {
  const percent = p.cap > 0 ? Math.round((p.spentSoFar / p.cap) * 100) : 0;
  const daysLeft = Math.max(0, p.daysInMonth - p.daysElapsed);
  const spent = Math.round(p.spentSoFar).toLocaleString("en-US");
  const cap = Math.round(p.cap).toLocaleString("en-US");
  return `You've used ${percent}% of your ${p.categoryName} budget ($${spent} of $${cap}) with ${daysLeft} day${daysLeft === 1 ? "" : "s"} left this month.`;
}

export type CategorySwing = {
  categoryId: string;
  categoryName: string;
  currentMonthSpend: number;
  avg3mo: number;
  // currentMonthSpend - avg3mo. Positive = spending more than usual.
  dollarSwing: number;
};

// For every expense category with spend history, compares this month's
// total to the trailing 3-month average and returns the biggest absolute
// dollar swings first — doesn't require a budget goal to exist (unlike
// pace projection), since this is about noticing a change, not a target.
export function computeBiggestSwings(
  transactions: Transaction[],
  categories: Category[],
  today: Date = new Date(),
): CategorySwing[] {
  const currentMonth = today.toISOString().slice(0, 7);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const spendByCategory = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category) continue;
    const byMonth = spendByCategory.get(t.category.id) ?? new Map<string, number>();
    byMonth.set(monthKey(t.date), (byMonth.get(monthKey(t.date)) ?? 0) + Number(t.amount));
    spendByCategory.set(t.category.id, byMonth);
  }

  const swings: CategorySwing[] = [];
  for (const [categoryId, byMonth] of spendByCategory) {
    const category = categoryById.get(categoryId);
    if (!category) continue;

    const currentMonthSpend = byMonth.get(currentMonth) ?? 0;
    let avgSum = 0;
    for (let i = 1; i <= 3; i++) {
      avgSum += byMonth.get(addMonths(currentMonth, -i)) ?? 0;
    }
    const avg3mo = avgSum / 3;

    if (Math.max(currentMonthSpend, avg3mo) < MIN_NOTABLE_AMOUNT) continue;

    swings.push({
      categoryId,
      categoryName: category.name,
      currentMonthSpend,
      avg3mo,
      dollarSwing: currentMonthSpend - avg3mo,
    });
  }

  swings.sort((a, b) => Math.abs(b.dollarSwing) - Math.abs(a.dollarSwing));
  return swings;
}

export function formatSwingSentence(s: CategorySwing): string {
  const amount = Math.round(Math.abs(s.dollarSwing)).toLocaleString("en-US");
  const direction = s.dollarSwing > 0 ? "up" : "down";
  return `${s.categoryName} is ${direction} $${amount} vs. your 3-month average this month.`;
}

export type PeriodComparison = {
  type: "income" | "expense";
  thisPeriodTotal: number;
  lastPeriodTotal: number;
  // thisPeriodTotal - lastPeriodTotal. Positive = more than the same point last month.
  difference: number;
};

// Compares this month so far to the *same number of elapsed days* last
// month (not all of last month) — otherwise a partial current month would
// always look artificially low next to a complete prior one.
export function computeMonthOverMonthComparison(
  transactions: Transaction[],
  type: "income" | "expense",
  today: Date = new Date(),
): PeriodComparison {
  const thisMonthPrefix = today.toISOString().slice(0, 7);
  const dayOfMonth = today.getDate();
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  let thisPeriodTotal = 0;
  let lastPeriodTotal = 0;
  for (const t of transactions) {
    if (t.type !== type) continue;
    if (t.date.startsWith(thisMonthPrefix)) {
      thisPeriodTotal += Number(t.amount);
    } else if (t.date.startsWith(lastMonthPrefix) && Number(t.date.slice(8, 10)) <= dayOfMonth) {
      lastPeriodTotal += Number(t.amount);
    }
  }

  return { type, thisPeriodTotal, lastPeriodTotal, difference: thisPeriodTotal - lastPeriodTotal };
}

export function formatPeriodComparisonSentence(c: PeriodComparison): string {
  const diff = Math.round(Math.abs(c.difference)).toLocaleString("en-US");
  const verb = c.type === "expense" ? "spent" : "earned";
  if (c.difference === 0) {
    return `You've ${verb} the same amount this month as you had by this point last month.`;
  }
  const direction = c.difference > 0 ? "more" : "less";
  return `You've ${verb} $${diff} ${direction} this month than you had by this point last month.`;
}

export type InsightSlide = {
  id: string;
  text: string;
  action?: { label: string; href: string };
};

// Assembles the Dashboard carousel's slide set from whatever's actually
// meaningful in the data — a category with nothing to say about it (no
// goal, no history) simply doesn't get a slide, rather than showing an
// empty/zero one.
export function buildDashboardInsightSlides(
  transactions: Transaction[],
  goals: Goal[],
  categories: Category[],
  today: Date = new Date(),
): InsightSlide[] {
  const slides: InsightSlide[] = [];

  const paceProjections = computePaceProjections(transactions, goals, categories, today);
  const overPace = paceProjections.find((p) => p.overBy > 0);
  if (overPace) {
    slides.push({
      id: `pace-${overPace.categoryId}`,
      text: formatPaceSentence(overPace),
      action: { label: "Adjust goal", href: "/profile#budget-goals" },
    });
  }

  // A different goal than the one already shown above, so the two
  // goal-related slides don't repeat the same category.
  const trackingCandidate = paceProjections.find((p) => p.categoryId !== overPace?.categoryId);
  if (trackingCandidate) {
    slides.push({
      id: `tracking-${trackingCandidate.categoryId}`,
      text: formatGoalTrackingSentence(trackingCandidate),
    });
  }

  const swings = computeBiggestSwings(transactions, categories, today);
  if (swings.length > 0) {
    slides.push({ id: `swing-${swings[0].categoryId}`, text: formatSwingSentence(swings[0]) });
  }

  const comparison = computeMonthOverMonthComparison(transactions, "expense", today);
  if (comparison.thisPeriodTotal > 0 || comparison.lastPeriodTotal > 0) {
    slides.push({ id: "period-comparison", text: formatPeriodComparisonSentence(comparison) });
  }

  // Always included (not filtered by "is this notable" like the swing/
  // comparison slides above) once there's enough history to compute it —
  // computeIllustrativeSavingsRate's own 3-completed-month gate is the only
  // condition, so this reliably shows up in the rotation rather than being
  // an occasional/optional slide.
  const illustrativeSavingsRate = computeIllustrativeSavingsRate(transactions, today);
  if (illustrativeSavingsRate) {
    slides.push({
      id: "illustrative-savings-rate",
      text: formatIllustrativeSavingsSentence(illustrativeSavingsRate),
    });
  }

  return slides;
}

export type IllustrativeSavingsRate = {
  avgMonthlyNet: number;
  hypotheticalYearlyTotal: number;
};

// Purely descriptive math over the last 3 *completed* calendar months (the
// current, still-in-progress month is excluded — it isn't a fair month to
// average in). This is NOT a forecast or prediction of the user's actual
// financial future, just "what a flat continuation of the recent average
// would add up to" — keep that framing in every string this feeds (see
// formatIllustrativeSavingsSentence below), and never rename this to
// anything with "forecast"/"predict"/"projection" in it. Returns null
// rather than computing on a thin sample when the user's history doesn't
// go back a full 3 completed months yet.
//
// Deliberately a narrower param type than the file's other Transaction —
// this is a plain sum by type, no category needed, so callers (e.g. the
// Profile page) can pass a lighter query result without joining categories
// just to satisfy an unused field.
export function computeIllustrativeSavingsRate(
  transactions: { date: string; amount: number; type: "income" | "expense" }[],
  today: Date = new Date(),
): IllustrativeSavingsRate | null {
  if (transactions.length === 0) return null;

  const currentMonth = today.toISOString().slice(0, 7);
  const earliestDate = transactions.reduce(
    (min, t) => (t.date < min ? t.date : min),
    transactions[0].date,
  );
  // The actual calendar date 3 months back (not the 1st of that month) —
  // otherwise someone whose history starts mid-month would be told they
  // don't have "3 months of history" a few weeks early.
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
    .toISOString()
    .slice(0, 10);
  if (earliestDate > threeMonthsAgo) return null;

  let totalNet = 0;
  for (let i = 1; i <= 3; i++) {
    const month = addMonths(currentMonth, -i);
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (!t.date.startsWith(month)) continue;
      if (t.type === "income") income += Number(t.amount);
      else expense += Number(t.amount);
    }
    totalNet += income - expense;
  }

  const avgMonthlyNet = totalNet / 3;
  return { avgMonthlyNet, hypotheticalYearlyTotal: avgMonthlyNet * 12 };
}

// Deliberately "if this continued, that would total" — never "you'll have"
// / "you're on track for" / "you'd be at", which read as predictions about
// the user's specific future rather than a plain what-if calculation. The
// disclaimer lives in the same sentence, not a separate footnote, so it
// can't be read in isolation from the number.
export function formatIllustrativeSavingsSentence(rate: IllustrativeSavingsRate): string {
  return (
    `If your average pace over the last 3 months continued, that would total ` +
    `${formatDollarSigned(rate.hypotheticalYearlyTotal)} over a year — though spending patterns ` +
    `often shift month to month, so this is illustrative, not a forecast.`
  );
}
