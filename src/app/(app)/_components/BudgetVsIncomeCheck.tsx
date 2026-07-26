import { formatCurrency } from "@/lib/format";

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

  const overBy = totalGoals - totalIncome;
  const isOverBudget = totalIncome > 0 && overBy > 0;

  return (
    <section
      className={`mb-6 rounded-xl border px-5 py-4 text-sm ${
        isOverBudget ? "border-critical/40 bg-critical/10" : "border-card-border bg-card"
      }`}
    >
      {totalIncome <= 0 ? (
        <p className="text-foreground-muted">
          Your budget goals total <span className="font-bold text-foreground">
            ${formatCurrency(totalGoals)}
          </span>{" "}
          a month. Add income transactions this month to see how that compares to what you&apos;re
          bringing in.
        </p>
      ) : isOverBudget ? (
        <p className="text-foreground">
          <span className="font-bold text-critical">Your goals don&apos;t add up:</span> you&apos;ve
          set ${formatCurrency(totalGoals)} in monthly goals, but earned $
          {formatCurrency(totalIncome)} this month — that&apos;s{" "}
          <span className="font-bold">${formatCurrency(overBy)}</span> more than you&apos;re
          bringing in.
        </p>
      ) : (
        <p className="text-foreground-muted">
          Your goals total <span className="font-bold text-foreground">${formatCurrency(totalGoals)}</span>{" "}
          a month, within your ${formatCurrency(totalIncome)} income this month.
        </p>
      )}
    </section>
  );
}
