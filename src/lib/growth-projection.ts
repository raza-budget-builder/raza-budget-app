// Static historical-average annual returns for a small set of well-known
// investment types — not a live market data feed. Purely illustrative:
// past performance doesn't predict future returns, which the card makes
// explicit rather than assuming users know that. Colors are picked to stay
// clear of this app's reserved status hues (positive green, attention
// orange, critical red, pending yellow) since these are identity, not
// status, and spread across the wheel rather than clustered near --accent
// so no single line reads as "the recommended one."
export type InvestmentOption = {
  key: string;
  label: string;
  annualReturnPercent: number;
  color: string;
};

export const INVESTMENT_OPTIONS: InvestmentOption[] = [
  { key: "sp500", label: "S&P 500", annualReturnPercent: 10, color: "#3b82f6" },
  { key: "nasdaq", label: "Nasdaq-100", annualReturnPercent: 13, color: "#a855f7" },
  { key: "bonds", label: "Bond fund", annualReturnPercent: 5, color: "#0d9488" },
  { key: "hysa", label: "High-yield savings", annualReturnPercent: 4.5, color: "#64748b" },
];

export const HORIZON_OPTIONS_YEARS = [5, 10, 20, 30] as const;

export type ProjectionPoint = { year: number } & Record<string, number>;

// Monthly compounding derived from the annual rate (not annualRate/12 — that
// understates growth) with a fixed contribution added each month, matching
// how a real recurring monthly deposit into an investment account behaves.
function projectYearlyBalances({
  startingAmount,
  monthlyContribution,
  annualReturnPercent,
  years,
}: {
  startingAmount: number;
  monthlyContribution: number;
  annualReturnPercent: number;
  years: number;
}): number[] {
  const monthlyRate = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  const yearly: number[] = [startingAmount];
  let balance = startingAmount;
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    if (month % 12 === 0) yearly.push(balance);
  }
  return yearly;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Forward-looking planning number, not a backward-looking actual average:
// average monthly income over the last 3 *completed* calendar months (same
// window dashboard-insights.ts's computeIllustrativeSavingsRate uses, kept
// as its own local copy since that one narrates actual net spend — this one
// answers "if I hit my usual income and stick to my spending goals, what's
// left to save," using every category's monthly_cap, not just Savings &
// Investments' — a user's plan is what they've budgeted everywhere, not one
// category. Floored at 0: a plan that spends more than it earns has nothing
// left over, not a negative default in the input.
export function computePlannedMonthlySavings(
  transactions: { date: string; amount: number; type: "income" | "expense" }[],
  goals: { monthly_cap: number }[],
  today: Date = new Date(),
): number {
  const currentMonth = today.toISOString().slice(0, 7);
  let totalIncome = 0;
  for (let i = 1; i <= 3; i++) {
    const month = addMonths(currentMonth, -i);
    totalIncome += transactions
      .filter((t) => t.type === "income" && t.date.startsWith(month))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }
  const avgMonthlyIncome = totalIncome / 3;
  const totalPlannedSpending = goals.reduce((sum, g) => sum + Number(g.monthly_cap), 0);
  return Math.max(0, avgMonthlyIncome - totalPlannedSpending);
}

export function buildGrowthProjections({
  startingAmount,
  monthlyContribution,
  years,
}: {
  startingAmount: number;
  monthlyContribution: number;
  years: number;
}): ProjectionPoint[] {
  const seriesByOption = INVESTMENT_OPTIONS.map((option) => ({
    key: option.key,
    yearly: projectYearlyBalances({
      startingAmount,
      monthlyContribution,
      annualReturnPercent: option.annualReturnPercent,
      years,
    }),
  }));

  const points: ProjectionPoint[] = [];
  for (let i = 0; i <= years; i++) {
    const point: ProjectionPoint = { year: i };
    for (const s of seriesByOption) point[s.key] = Math.round(s.yearly[i]);
    points.push(point);
  }
  return points;
}
