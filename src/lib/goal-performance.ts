import type { GoalPerformance } from "./goal-summary";

type Category = { id: string; name: string };
type GoalRow = { category_id: string; monthly_cap: number };
type Transaction = {
  amount: number;
  type: "income" | "expense";
  category: { id: string } | null;
};

// Same cap-vs-spend aggregation the Goals page builds inline for its AI
// summary call — lifted out so the chat tools can call it too, without
// touching goals/page.tsx's own usage.
export function getGoalPerformance(
  transactions: Transaction[],
  goals: GoalRow[],
  categories: Category[],
): GoalPerformance[] {
  const spendByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category) continue;
    spendByCategory.set(
      t.category.id,
      (spendByCategory.get(t.category.id) ?? 0) + Number(t.amount),
    );
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return goals.map((g) => ({
    categoryId: g.category_id,
    name: categoryById.get(g.category_id)?.name ?? "Uncategorized",
    cap: g.monthly_cap,
    spend: spendByCategory.get(g.category_id) ?? 0,
  }));
}
