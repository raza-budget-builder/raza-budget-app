// Pure calculation logic for the Insights "Budget forecast" widget — no AI
// call, just arithmetic on data already loaded for the page. For each
// variable-spend category, projects this month's total by extrapolating
// spend-so-far at today's daily pace out to month-end (the same "spend so
// far / days elapsed * days in month" projection dashboard-insights.ts uses
// for the single-goal pace card), then compares that projection to the
// category's own trailing 3-month average — the same "usual" baseline
// computeBiggestSwings uses — to predict whether it's headed over or under
// its normal pace.

const MIN_NOTABLE_AMOUNT = 20; // same floor as drift-alerts.ts / dashboard-insights.ts
const NOTABLE_CHANGE_RATIO = 0.1; // 10%+ off the 3mo average to be worth surfacing
// A day or two into the month, "$8 spent so far" extrapolates to a wild
// month-end number — wait for a big enough sample that the daily pace
// actually means something.
const MIN_DAYS_ELAPSED = 5;
const MAX_PER_SIDE = 3;

// These are hardcoded is_variable: false (a known/committed amount, not a
// naturally fluctuating one) — but forecasting still makes sense for them,
// with "more than usual" read as good news rather than overspending: paying
// down debt faster or investing more isn't going over budget.
const INVERTED_CATEGORY_NAMES = new Set(["Savings & Investments", "Debt Payments"]);

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string; name: string } | null;
};

type Category = { id: string; name: string; is_variable: boolean | null };

function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type BudgetForecastEntry = {
  categoryId: string;
  categoryName: string;
  projectedTotal: number;
  avg3mo: number;
  // projectedTotal - avg3mo. Positive = projected to spend more than usual.
  changeAmount: number;
  changeRatio: number;
  inverted: boolean;
};

export type BudgetForecast = {
  // "Trending over" — projected to spend notably more than usual (or, for
  // an inverted category, notably less toward debt/savings than usual).
  overBudget: BudgetForecastEntry[];
  // "Trending under" — the good-news side: projected to spend notably less
  // than usual, or (inverted categories) notably more toward debt/savings.
  underBudget: BudgetForecastEntry[];
};

export function computeBudgetForecast(
  transactions: Transaction[],
  categories: Category[],
  today: Date = new Date(),
): BudgetForecast {
  const daysElapsed = today.getDate();
  if (daysElapsed < MIN_DAYS_ELAPSED) return { overBudget: [], underBudget: [] };

  const currentMonth = today.toISOString().slice(0, 7);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const spendByCategory = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category) continue;
    const byMonth = spendByCategory.get(t.category.id) ?? new Map<string, number>();
    byMonth.set(monthKey(t.date), (byMonth.get(monthKey(t.date)) ?? 0) + Number(t.amount));
    spendByCategory.set(t.category.id, byMonth);
  }

  const entries: BudgetForecastEntry[] = [];
  for (const [categoryId, byMonth] of spendByCategory) {
    const category = categoryById.get(categoryId);
    if (!category) continue;

    const inverted = INVERTED_CATEGORY_NAMES.has(category.name);
    // Fixed expenses (Rent, Insurance, Subscriptions, ...) don't get a pace
    // projection — there's nothing to "forecast" about a payment that's the
    // same known amount every month — except the two named exceptions above.
    if (category.is_variable !== true && !inverted) continue;

    const spentSoFar = byMonth.get(currentMonth) ?? 0;
    const projectedTotal = (spentSoFar / daysElapsed) * daysInMonth;

    let avgSum = 0;
    for (let i = 1; i <= 3; i++) avgSum += byMonth.get(addMonths(currentMonth, -i)) ?? 0;
    const avg3mo = avgSum / 3;

    if (Math.max(projectedTotal, avg3mo) < MIN_NOTABLE_AMOUNT) continue;

    const changeAmount = projectedTotal - avg3mo;
    const changeRatio = avg3mo > 0 ? changeAmount / avg3mo : projectedTotal > 0 ? Infinity : 0;
    if (Math.abs(changeRatio) < NOTABLE_CHANGE_RATIO) continue;

    entries.push({
      categoryId,
      categoryName: category.name,
      projectedTotal,
      avg3mo,
      changeAmount,
      changeRatio,
      inverted,
    });
  }

  // "Good" (underBudget) = projected to spend less than usual, or — for an
  // inverted category — projected to put more than usual toward it.
  const isGoodNews = (e: BudgetForecastEntry) =>
    e.inverted ? e.changeAmount > 0 : e.changeAmount < 0;

  const underBudget = entries.filter(isGoodNews);
  const overBudget = entries.filter((e) => !isGoodNews(e));

  const byBiggestSwing = (a: BudgetForecastEntry, b: BudgetForecastEntry) =>
    Math.abs(b.changeAmount) - Math.abs(a.changeAmount);
  underBudget.sort(byBiggestSwing);
  overBudget.sort(byBiggestSwing);

  return {
    overBudget: overBudget.slice(0, MAX_PER_SIDE),
    underBudget: underBudget.slice(0, MAX_PER_SIDE),
  };
}

export function formatForecastSentence(entry: BudgetForecastEntry): string {
  const projected = Math.round(entry.projectedTotal).toLocaleString("en-US");
  const usual = Math.round(entry.avg3mo).toLocaleString("en-US");
  return `On pace for $${projected} — your usual is about $${usual}.`;
}
