import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { BudgetSplitModule } from "../_components/BudgetSplitModule";
import { GrowthExplorerCard } from "../_components/GrowthExplorerCard";
import { NarrativeSummaryModule } from "../_components/NarrativeSummaryModule";
import { NetFlowChart } from "../_components/NetFlowChart";
import { DriftAlertsModule } from "../_components/DriftAlertsModule";
import { BudgetForecastModule } from "../_components/BudgetForecastModule";
import { CashFlowForecastCard } from "../_components/CashFlowForecastCard";
import { getWeeklyNarrativeSummary } from "@/lib/weekly-summary";
import { buildCumulativeNetFlow } from "@/lib/net-flow";
import { buildBudgetSplit } from "@/lib/budget-split";
import { computePlannedMonthlySavings } from "@/lib/growth-projection";
import { getDriftAlerts } from "@/lib/drift-alerts";
import { computeBudgetForecast } from "@/lib/budget-forecast";
import { HORIZON_OPTIONS_DAYS, computeDailyIrregularSpend } from "@/lib/cashflow-projection";
import { computeRecurringOccurrencesWithinHorizon } from "@/lib/recurring-generation";

type MonthTransaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string; name: string; budget_group: string | null } | null;
  recurring_group_id: string | null;
};

type BudgetGoalRow = { monthly_cap: number };
type CategoryRow = { id: string; name: string; is_variable: boolean | null };

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const maxHorizonDays = Math.max(...HORIZON_OPTIONS_DAYS);
  const horizonEndISO = new Date(today.getTime() + maxHorizonDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: transactions, error },
    { data: budgetGoals, error: goalsError },
    { data: categories, error: categoriesError },
    recurringOccurrences,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "date, amount, type, category:categories(id, name, budget_group), recurring_group_id",
      )
      // Pending recurring predictions aren't real yet — exclude from the split.
      .neq("status", "pending")
      .returns<MonthTransaction[]>(),
    supabase
      .from("budget_goals")
      .select("monthly_cap")
      .eq("user_id", user.id)
      .returns<BudgetGoalRow[]>(),
    supabase
      .from("categories")
      .select("id, name, is_variable")
      .eq("user_id", user.id)
      .returns<CategoryRow[]>(),
    computeRecurringOccurrencesWithinHorizon(supabase, user.id, horizonEndISO),
  ]);

  if (error) console.error("transactions error", error);
  if (goalsError) console.error("budget goals error", goalsError);
  if (categoriesError) console.error("categories error", categoriesError);

  const allTransactions = transactions ?? [];

  // Independent of each other, so run concurrently rather than paying for
  // two sequential round-trips to Claude when both need to regenerate.
  const [narrativeSummary, driftAlerts] = await Promise.all([
    getWeeklyNarrativeSummary(supabase, user.id),
    getDriftAlerts(supabase, user.id, allTransactions),
  ]);
  const netFlowPoints = buildCumulativeNetFlow(allTransactions);

  // Cash Flow Forecast's starting point — the same cumulative figure
  // NetFlowChart's "Your Savings Journey" hero shows just above it, so the
  // two cards read as one continuous history-then-forecast story.
  const startingBalance = netFlowPoints.at(-1)?.cumulative ?? 0;
  const dailyIrregularSpend = computeDailyIrregularSpend(
    allTransactions.map((t) => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      recurringGroupId: t.recurring_group_id,
    })),
    today,
  );

  // Growth Explorer's two seeds: a planned monthly contribution — average
  // monthly income over the last 3 completed months minus every category's
  // combined spending goal, i.e. what's left over if the plan is followed —
  // and a lifetime-saved total reusing the 50-30-20 module's own "Savings"
  // definition (income minus non-excluded spending, same transactions
  // already fetched above), so the two cards read as one continuous story.
  const plannedMonthlySavings = computePlannedMonthlySavings(allTransactions, budgetGoals ?? []);
  const lifetimeSavings =
    buildBudgetSplit(allTransactions).rows.find((r) => r.group === "savings")?.actual ?? 0;
  const budgetForecast = computeBudgetForecast(allTransactions, categories ?? []);

  return (
    <div>
      <PageHeader title="Insights" />

      <NarrativeSummaryModule data={narrativeSummary} />
      <NetFlowChart points={netFlowPoints} />
      <CashFlowForecastCard
        startingBalance={startingBalance}
        dailyIrregularSpend={dailyIrregularSpend}
        recurringOccurrences={recurringOccurrences}
      />
      <DriftAlertsModule data={driftAlerts} />
      <BudgetForecastModule {...budgetForecast} />
      <BudgetSplitModule transactions={allTransactions} />
      <GrowthExplorerCard
        defaultMonthlyContribution={plannedMonthlySavings}
        savedSoFar={lifetimeSavings}
      />
    </div>
  );
}
