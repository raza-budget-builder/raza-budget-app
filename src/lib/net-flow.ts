export type MonthlyNetFlowPoint = {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2025"
  net: number; // that month's income minus non-excluded expenses
  cumulative: number; // running total through this month
};

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { budget_group: string | null } | null;
};

function enumerateMonths(startKey: string, endKey: string): string[] {
  const months: string[] = [];
  let [y, m] = startKey.split("-").map(Number);
  const [endY, endM] = endKey.split("-").map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Same rules as buildBudgetSplit (src/lib/budget-split.ts): net is income
// minus expenses, both filtered to categories whose budget_group isn't
// "excluded" (Taxes, Business Expenses, Other Expense). Callers are expected
// to have already filtered out pending/unconfirmed recurring predictions
// (e.g. via `.neq("status", "pending")`, the same pattern used across the
// app) — this function doesn't re-check status since it isn't selected here.
// Confirmed transfers are never stored as transactions at all (dropped
// during CSV import review), so no transfer filtering is needed either.
export function buildCumulativeNetFlow(transactions: Transaction[]): MonthlyNetFlowPoint[] {
  if (transactions.length === 0) return [];

  const sortedDates = transactions.map((t) => t.date).sort();
  const firstMonth = sortedDates[0].slice(0, 7);
  const lastMonth = sortedDates[sortedDates.length - 1].slice(0, 7);

  const netByMonth = new Map<string, number>();
  for (const t of transactions) {
    if (t.category?.budget_group === "excluded") continue;
    const month = t.date.slice(0, 7);
    const delta = t.type === "income" ? Number(t.amount) : -Number(t.amount);
    netByMonth.set(month, (netByMonth.get(month) ?? 0) + delta);
  }

  let cumulative = 0;
  return enumerateMonths(firstMonth, lastMonth).map((month) => {
    // A month can have zero net activity yet still exist in the range
    // (e.g. it only had excluded-category transactions, or none at all) —
    // it still gets a point, just a flat segment, per the no-gap requirement.
    const net = netByMonth.get(month) ?? 0;
    cumulative += net;
    return { month, label: formatMonthLabel(month), net, cumulative };
  });
}
