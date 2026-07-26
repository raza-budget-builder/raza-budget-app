import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { DashboardQuickActions } from "../_components/DashboardQuickActions";
import { TransactionList } from "../_components/TransactionList";
import { NeedsReviewList } from "../_components/NeedsReviewList";
import type { RecurringInterval } from "@/lib/recurring";

type TransactionRowData = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  source: string;
  confirmed: boolean;
  is_recurring: boolean;
  recurring_group_id: string | null;
  recurring_interval: RecurringInterval | null;
  status: "confirmed" | "pending";
  category: { id: string; name: string } | null;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: categories, error: categoriesError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, type")
      .order("type")
      .order("name"),
    supabase
      .from("transactions")
      .select(
        "id, date, description, amount, type, source, confirmed, is_recurring, recurring_group_id, recurring_interval, status, category:categories(id, name)",
      )
      .order("date", { ascending: false })
      .returns<TransactionRowData[]>(),
  ]);
  if (categoriesError) console.error("categories error", categoriesError);
  if (transactionsError)
    console.error("transactions error", transactionsError);

  const allTransactions = transactions ?? [];
  const allCategories = categories ?? [];
  const needsReview = allTransactions.filter((t) => !t.confirmed);

  return (
    <div>
      <PageHeader title="Transactions" />

      {error && (
        <p className="mb-4 rounded-xl bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      )}

      <DashboardQuickActions
        categories={allCategories}
        needsReviewCount={needsReview.length}
      />

      <NeedsReviewList transactions={needsReview} categories={allCategories} />

      <TransactionList transactions={allTransactions} categories={allCategories} />
    </div>
  );
}
