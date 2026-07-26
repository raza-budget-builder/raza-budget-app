import { formatCurrency, formatDollarSigned } from "@/lib/format";

// Simple addition, on purpose — this isn't trying to be a forecast, just a
// quick "do your goals even add up to a sustainable budget" gate before the
// user finds that out the hard way mid-month.
export function BudgetVsIncomeCheck({
  totalGoals,
  totalIncome,
}: {
  totalGoals: number;
  totalIncome: number;
}) {
  if (totalGoals <= 0) return null;

  // No income data yet — nothing to compare against, so this can't be a
  // hero "headroom" number the way the other two states are. Simple, plain
  // fallback rather than a tinted hero block for a figure we can't judge.
  if (totalIncome <= 0) {
    return (
      <section className="mb-4 rounded-xl bg-card p-5 text-sm text-foreground-muted">
        Your budget goals total <span className="font-bold text-foreground">
          ${formatCurrency(totalGoals)}
        </span>{" "}
        a month. Add income transactions this month to see how that compares to what you&apos;re
        bringing in.
      </section>
    );
  }

  // Same "headroom" framing as the Dashboard hero — income minus goals,
  // positive is good (green), negative means the goals don't fit the
  // income (red) — one signed number instead of three separate figures to
  // parse.
  const headroom = totalIncome - totalGoals;
  const headroomVar = headroom >= 0 ? "--positive" : "--critical";

  return (
    <section className="mb-4">
      <div
        className="rounded-xl p-6"
        style={{ background: `color-mix(in srgb, var(${headroomVar}) 10%, var(--card))` }}
      >
        <p className="text-xs font-medium text-foreground-muted">
          {headroom >= 0 ? "Left after your goals" : "Over your income by"}
        </p>
        <p className="mt-1 truncate text-4xl font-bold" style={{ color: `var(${headroomVar})` }}>
          {formatDollarSigned(headroom)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-xl bg-card p-4">
          <p className="text-xs font-medium text-foreground-muted">Goals</p>
          <p className="mt-1 truncate text-lg font-bold text-foreground">
            ${formatCurrency(totalGoals)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-card p-4">
          <p className="text-xs font-medium text-foreground-muted">Income</p>
          <p className="mt-1 truncate text-lg font-bold text-positive">
            ${formatCurrency(totalIncome)}
          </p>
        </div>
      </div>
    </section>
  );
}
