import {
  formatForecastSentence,
  type BudgetForecast,
  type BudgetForecastEntry,
} from "@/lib/budget-forecast";
import { CategoryIconBadge } from "./CategoryIconBadge";

function ForecastRow({
  entry,
  tone,
}: {
  entry: BudgetForecastEntry;
  tone: "positive" | "attention";
}) {
  return (
    <li className="flex items-start gap-3">
      <CategoryIconBadge categoryName={entry.categoryName} tone={tone} />
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-bold text-foreground">{entry.categoryName}</p>
        <p className="text-xs text-foreground-muted">{formatForecastSentence(entry)}</p>
      </div>
    </li>
  );
}

// Lives in Insights, after Drift Alerts — that module explains what already
// happened this month; this one is the forward-looking half, projecting
// where each variable category is headed if its current pace holds.
export function BudgetForecastModule({ overBudget, underBudget }: BudgetForecast) {
  const hasAny = overBudget.length > 0 || underBudget.length > 0;

  return (
    <section className="mb-4 rounded-xl bg-card p-5">
      <h2 className="font-bold text-foreground">Budget forecast</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Where this month is headed if your pace so far continues, compared to your own 3-month
        average.
      </p>

      {hasAny ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {underBudget.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-positive uppercase">
                Trending under
              </p>
              <ul className="mt-3 space-y-3">
                {underBudget.map((entry) => (
                  <ForecastRow key={entry.categoryId} entry={entry} tone="positive" />
                ))}
              </ul>
            </div>
          )}
          {overBudget.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-attention uppercase">
                Trending over
              </p>
              <ul className="mt-3 space-y-3">
                {overBudget.map((entry) => (
                  <ForecastRow key={entry.categoryId} entry={entry} tone="attention" />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-foreground-muted">
          Nothing trending notably off pace yet this month — check back in a few days.
        </p>
      )}

      <p className="mt-4 text-xs text-foreground-muted">
        Fixed expenses like rent and subscriptions aren&apos;t included — there&apos;s no pace to
        project for a payment that&apos;s the same every month.
      </p>
    </section>
  );
}
