import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { GoalsSummaryCard } from "../_components/GoalsSummaryCard";
import { GoalsList } from "../_components/GoalsList";
import { BudgetVsIncomeCheck } from "../_components/BudgetVsIncomeCheck";
import { getMonthlyGoalSummary, type GoalPerformance } from "@/lib/goal-summary";

type Category = { id: string; name: string };
type GoalRow = { category_id: string; monthly_cap: number };
type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string } | null;
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Nothing on this page ever looks past the current calendar month, so
  // scope the query itself instead of fetching the full transaction
  // history and filtering in JS — this only gets more wasteful as history
  // grows from CSV imports.
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const monthStart = `${monthPrefix}-01`;
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  const [
    { data: categories, error: categoriesError },
    { data: goals, error: goalsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("type", "expense")
      .order("name")
      .returns<Category[]>(),
    supabase
      .from("budget_goals")
      .select("category_id, monthly_cap")
      .eq("user_id", user.id)
      .returns<GoalRow[]>(),
    supabase
      .from("transactions")
      .select("date, amount, type, category:categories(id)")
      .gte("date", monthStart)
      .lt("date", nextMonthStart)
      // Pending recurring predictions aren't real yet — exclude from spend.
      .neq("status", "pending")
      .returns<Transaction[]>(),
  ]);

  if (categoriesError) console.error("categories error", categoriesError);
  if (goalsError) console.error("goals error", goalsError);
  if (transactionsError) console.error("transactions error", transactionsError);

  const allCategories = categories ?? [];
  const allGoals = goals ?? [];
  const allTransactions = transactions ?? [];

  const spendByCategory = new Map<string, number>();
  let totalIncome = 0;
  for (const t of allTransactions) {
    if (t.type === "income") {
      totalIncome += Number(t.amount);
      continue;
    }
    if (!t.category) continue;
    spendByCategory.set(
      t.category.id,
      (spendByCategory.get(t.category.id) ?? 0) + Number(t.amount),
    );
  }
  const totalGoals = allGoals.reduce((sum, g) => sum + Number(g.monthly_cap), 0);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const goalsForSummary: GoalPerformance[] = allGoals.map((g) => ({
    categoryId: g.category_id,
    name: categoryById.get(g.category_id)?.name ?? "Uncategorized",
    cap: g.monthly_cap,
    spend: spendByCategory.get(g.category_id) ?? 0,
  }));

  const goalSummary = await getMonthlyGoalSummary(supabase, user.id, goalsForSummary);

  return (
    <div>
      <PageHeader
        title="Goals"
        extra={
          <Link
            href="/profile#budget-goals"
            className="rounded-xl border border-card-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
          >
            Edit Goals
          </Link>
        }
      />

      <BudgetVsIncomeCheck totalGoals={totalGoals} totalIncome={totalIncome} />
      <GoalsSummaryCard data={goalSummary} />
      <GoalsList categories={allCategories} goals={allGoals} transactions={allTransactions} />
    </div>
  );
}
