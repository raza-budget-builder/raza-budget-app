export type CategorySpend = { name: string; value: number };

const MAX_PIE_SLICES = 6;

// Uncapped per-category totals, sorted descending — the shape most callers
// actually want (e.g. the chat tools' get_category_spend, which needs every
// category, not a chart-sized slice). buildCategorySpend below layers the
// top-6-plus-Other capping on top for the pie/bar chart callers.
export function buildCategoryTotals(
  transactions: {
    amount: number;
    type: "income" | "expense";
    category: { name: string } | null;
  }[],
  type: "income" | "expense" = "expense",
): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const name = t.category?.name ?? "Uncategorized";
    totals.set(name, (totals.get(name) ?? 0) + Number(t.amount));
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildCategorySpend(
  transactions: {
    amount: number;
    type: "income" | "expense";
    category: { name: string } | null;
  }[],
  type: "income" | "expense" = "expense",
): CategorySpend[] {
  const sorted = buildCategoryTotals(transactions, type);

  if (sorted.length <= MAX_PIE_SLICES) return sorted;

  const top = sorted.slice(0, MAX_PIE_SLICES - 1);
  const otherTotal = sorted
    .slice(MAX_PIE_SLICES - 1)
    .reduce((sum, c) => sum + c.value, 0);
  return [...top, { name: "Other", value: otherTotal }];
}
