export type CategorySpend = { name: string; value: number };

const MAX_PIE_SLICES = 6;

export function buildCategorySpend(
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

  const sorted = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= MAX_PIE_SLICES) return sorted;

  const top = sorted.slice(0, MAX_PIE_SLICES - 1);
  const otherTotal = sorted
    .slice(MAX_PIE_SLICES - 1)
    .reduce((sum, c) => sum + c.value, 0);
  return [...top, { name: "Other", value: otherTotal }];
}
