import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { BudgetSplitModule } from "../_components/BudgetSplitModule";
import { GrowthExplorerCard } from "../_components/GrowthExplorerCard";
import { NarrativeSummaryModule } from "../_components/NarrativeSummaryModule";
import { NetFlowChart } from "../_components/NetFlowChart";
import { DriftAlertsModule } from "../_components/DriftAlertsModule";
import { getWeeklyNarrativeSummary } from "@/lib/weekly-summary";
import { buildCumulativeNetFlow } from "@/lib/net-flow";
import { buildBudgetSplit } from "@/lib/budget-split";
import { computePlannedMonthlySavings } from "@/lib/growth-projection";
import { getDriftAlerts } from "@/lib/drift-alerts";

type MonthTransaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string; budget_group: string | null } | null;
};

type BudgetGoalRow = { monthly_cap: number };

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: transactions, error }, { data: budgetGoals, error: goalsError }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("date, amount, type, category:categories(name, budget_group)")
        // Pending recurring predictions aren't real yet — exclude from the split.
        .neq("status", "pending")
        .returns<MonthTransaction[]>(),
      supabase
        .from("budget_goals")
        .select("monthly_cap")
        .eq("user_id", user.id)
        .returns<BudgetGoalRow[]>(),
    ]);

  if (error) console.error("transactions error", error);
  if (goalsError) console.error("budget goals error", goalsError);

  const allTransactions = transactions ?? [];

  // Independent of each other, so run concurrently rather than paying for
  // two sequential round-trips to Claude when both need to regenerate.
  const [narrativeSummary, driftAlerts] = await Promise.all([
    getWeeklyNarrativeSummary(supabase, user.id),
    getDriftAlerts(supabase, user.id, allTransactions),
  ]);
  const netFlowPoints = buildCumulativeNetFlow(allTransactions);

  // Growth Explorer's two seeds: a planned monthly contribution — average
  // monthly income over the last 3 completed months minus every category's
  // combined spending goal, i.e. what's left over if the plan is followed —
  // and a lifetime-saved total reusing the 50-30-20 module's own "Savings"
  // definition (income minus non-excluded spending, same transactions
  // already fetched above), so the two cards read as one continuous story.
  const plannedMonthlySavings = computePlannedMonthlySavings(allTransactions, budgetGoals ?? []);
  const lifetimeSavings =
    buildBudgetSplit(allTransactions).rows.find((r) => r.group === "savings")?.actual ?? 0;

  return (
    <div>
      <PageHeader title="Insights" />

      <NarrativeSummaryModule data={narrativeSummary} />
      <NetFlowChart points={netFlowPoints} />
      <DriftAlertsModule data={driftAlerts} />
      <BudgetSplitModule transactions={allTransactions} />
      <GrowthExplorerCard
        defaultMonthlyContribution={plannedMonthlySavings}
        savedSoFar={lifetimeSavings}
      />
    </div>
  );
}
