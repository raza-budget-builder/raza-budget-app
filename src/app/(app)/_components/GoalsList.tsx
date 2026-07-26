import { formatCurrency } from "@/lib/format";

// Same green/orange used for income/expense text and the 50-30-20 meters,
// plus a genuine red for "well over budget" — a third tier those two don't
// need. All three contrast-validated (≥5.5:1) against the dark card surface.
const GOOD_COLOR = "var(--positive)";
const WARNING_COLOR = "var(--attention)";
const OVER_COLOR = "var(--critical)";

// Below this fraction of the goal is "good"; from here up to 100% is the
// "approaching" warning band; anything past 100% is "over".
const WARNING_FLOOR = 0.7;

type Category = { id: string; name: string };

type Goal = {
  category_id: string;
  monthly_cap: number;
};

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string } | null;
};

function statusColor(ratio: number) {
  if (ratio < WARNING_FLOOR) return GOOD_COLOR;
  if (ratio <= 1) return WARNING_COLOR;
  return OVER_COLOR;
}

function statusText(ratio: number) {
  if (ratio < WARNING_FLOOR) return "On track";
  if (ratio <= 1) return "Approaching budget";
  return `${Math.round((ratio - 1) * 100)}% over budget`;
}

export function GoalsList({
  categories,
  goals,
  transactions,
}: {
  categories: Category[];
  goals: Goal[];
  transactions: Transaction[];
}) {
  const monthPrefix = new Date().toISOString().slice(0, 7);

  const spendByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category || !t.date.startsWith(monthPrefix)) continue;
    spendByCategory.set(
      t.category.id,
      (spendByCategory.get(t.category.id) ?? 0) + Number(t.amount),
    );
  }

  const capByCategory = new Map(goals.map((g) => [g.category_id, g.monthly_cap]));

  const withGoal = categories
    .filter((c) => capByCategory.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const withoutGoal = categories
    .filter((c) => !capByCategory.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-card">
      {withGoal.map((c) => {
        const cap = capByCategory.get(c.id)!;
        const spend = spendByCategory.get(c.id) ?? 0;
        const ratio = cap > 0 ? spend / cap : 0;
        const fillWidth = Math.min(100, Math.max(0, ratio * 100));
        const color = statusColor(ratio);

        return (
          <li key={c.id} className="px-4 py-3 text-sm">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-bold text-foreground">{c.name}</span>
              <span className="text-foreground-muted">
                ${formatCurrency(spend)} of ${formatCurrency(cap)} ·{" "}
                {Math.round(ratio * 100)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-foreground/10">
              <div
                className="h-2.5 rounded-full"
                style={{ width: `${fillWidth}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-1.5 text-xs text-foreground-muted">{statusText(ratio)}</p>
          </li>
        );
      })}
      {withoutGoal.map((c) => (
        <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="font-bold text-foreground">{c.name}</span>
          <span className="text-foreground-muted">Not set</span>
        </li>
      ))}
    </ul>
  );
}
