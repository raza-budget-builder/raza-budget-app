import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { BudgetSplitModule } from "../_components/BudgetSplitModule";
import { NarrativeSummaryModule } from "../_components/NarrativeSummaryModule";
import { NetFlowChart } from "../_components/NetFlowChart";
import { DriftAlertsModule } from "../_components/DriftAlertsModule";
import { getWeeklyNarrativeSummary } from "@/lib/weekly-summary";
import { buildCumulativeNetFlow } from "@/lib/net-flow";
import { getDriftAlerts } from "@/lib/drift-alerts";

type MonthTransaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string; budget_group: string | null } | null;
};

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("date, amount, type, category:categories(name, budget_group)")
    // Pending recurring predictions aren't real yet — exclude from the split.
    .neq("status", "pending")
    .returns<MonthTransaction[]>();

  if (error) console.error("transactions error", error);

  const allTransactions = transactions ?? [];

  // Independent of each other, so run concurrently rather than paying for
  // two sequential round-trips to Claude when both need to regenerate.
  const [narrativeSummary, driftAlerts] = await Promise.all([
    getWeeklyNarrativeSummary(supabase, user.id),
    getDriftAlerts(supabase, user.id, allTransactions),
  ]);
  const netFlowPoints = buildCumulativeNetFlow(allTransactions);

  return (
    <div>
      <PageHeader title="Insights" />

      <NarrativeSummaryModule data={narrativeSummary} />
      <NetFlowChart points={netFlowPoints} />
      <DriftAlertsModule data={driftAlerts} />
      <BudgetSplitModule transactions={allTransactions} />
    </div>
  );
}
