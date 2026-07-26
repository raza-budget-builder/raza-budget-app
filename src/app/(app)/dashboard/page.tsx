import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { ThemeToggle } from "../_components/ThemeToggle";
import { DashboardQuickActions } from "../_components/DashboardQuickActions";
import { CategoryCharts } from "../_components/CategoryCharts";
import { SummaryCard } from "../_components/SummaryCard";
import { AMOUNT_TEXT_CLASS, PENDING_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { computeUpcomingRecurring } from "@/lib/recurring-generation";
import { buildDashboardInsightSlides } from "@/lib/dashboard-insights";
import { InsightsCarousel } from "../_components/InsightsCarousel";

const INTERVAL_LABEL: Record<"weekly" | "biweekly" | "monthly", string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

type TransactionRowData = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "confirmed" | "pending";
  category: { id: string; name: string } | null;
};

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type Goal = { category_id: string; monthly_cap: number };

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: transactions, error: transactionsError },
    { data: categories, error: categoriesError },
    { data: goals, error: goalsError },
    { count: needsReviewCount, error: needsReviewError },
    upcomingRecurring,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, description, amount, type, status, category:categories(id, name)")
      .order("date", { ascending: false })
      .returns<TransactionRowData[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .order("type")
      .order("name")
      .returns<Category[]>(),
    supabase
      .from("budget_goals")
      .select("category_id, monthly_cap")
      .eq("user_id", user.id)
      .returns<Goal[]>(),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("confirmed", false),
    computeUpcomingRecurring(supabase, user.id),
  ]);

  if (transactionsError) console.error("transactions error", transactionsError);
  if (categoriesError) console.error("categories error", categoriesError);
  if (goalsError) console.error("goals error", goalsError);
  if (needsReviewError) console.error("needs review count error", needsReviewError);

  const allTransactions = transactions ?? [];
  // Pending recurring predictions aren't real yet — every total, chart, and
  // summary excludes them until the user confirms. They still show up in
  // "Last 7 days" below, just visually distinguished.
  const confirmedTransactions = allTransactions.filter((t) => t.status !== "pending");

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days inclusive of today
  const rangeStart = sevenDaysAgo.toISOString().slice(0, 10);
  const rangeEnd = today.toISOString().slice(0, 10);
  const last7Days = allTransactions.filter(
    (t) => t.date >= rangeStart && t.date <= rangeEnd,
  );

  const insightSlides = buildDashboardInsightSlides(
    confirmedTransactions,
    goals ?? [],
    categories ?? [],
    today,
  );

  return (
    <div>
      <PageHeader title="Dashboard" extra={<ThemeToggle />} />

      <DashboardQuickActions
        categories={categories ?? []}
        needsReviewCount={needsReviewCount ?? 0}
      />

      <SummaryCard transactions={confirmedTransactions} />

      <InsightsCarousel slides={insightSlides} />

      <section className="mb-10 rounded-xl border border-card-border bg-card p-6">
        <CategoryCharts transactions={confirmedTransactions} />
      </section>

      <section>
        <h2 className="mb-4 font-bold text-foreground">Last 7 days</h2>
        {last7Days.length > 0 ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-card">
            {last7Days.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate font-medium ${
                      t.status === "pending" ? PENDING_TEXT_CLASS : "text-foreground"
                    }`}
                  >
                    {t.description}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {t.date} · {t.category?.name ?? "Uncategorized"}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-base font-bold ${
                    t.status === "pending" ? PENDING_TEXT_CLASS : AMOUNT_TEXT_CLASS[t.type]
                  }`}
                >
                  {formatSignedAmount(t.amount, t.type)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No transactions in the last 7 days.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-bold text-foreground">Upcoming</h2>
        {upcomingRecurring.length > 0 ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-card">
            {upcomingRecurring.map((series) => (
              <li
                key={series.groupId}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{series.description}</p>
                  <p className="text-xs text-foreground-muted">
                    {series.nextDate} · {INTERVAL_LABEL[series.interval]}
                  </p>
                </div>
                <span className={`shrink-0 text-base font-bold ${AMOUNT_TEXT_CLASS[series.type]}`}>
                  {formatSignedAmount(series.amount, series.type)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No upcoming recurring transactions.</p>
        )}
      </section>
    </div>
  );
}
