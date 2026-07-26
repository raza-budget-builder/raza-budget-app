import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";
import { RecurringSeriesList } from "../_components/RecurringSeriesList";
import { ImportsSection } from "../_components/ImportsSection";
import { CloseIcon } from "../_components/icons";
import { listRecurringSeries } from "@/lib/recurring-generation";
import { listCsvImports } from "../import-actions";
import { updateProfileInfo, updateBudgetGoals } from "./actions";

type Category = { id: string; name: string };
type AllCategory = { id: string; name: string; type: "income" | "expense" };
type BudgetGoalRow = { category_id: string; monthly_cap: number };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: expenseCategories, error: categoriesError },
    { data: budgetGoals, error: budgetGoalsError },
    { data: allCategories, error: allCategoriesError },
    recurringSeries,
    csvImports,
  ] = await Promise.all([
    supabase.from("profiles").select("name, main_goal").eq("id", user.id).single(),
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
      .returns<BudgetGoalRow[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .order("type")
      .order("name")
      .returns<AllCategory[]>(),
    listRecurringSeries(supabase, user.id),
    listCsvImports(),
  ]);

  if (categoriesError) console.error("categories error", categoriesError);
  if (budgetGoalsError) console.error("budget goals error", budgetGoalsError);
  if (allCategoriesError) console.error("categories error", allCategoriesError);

  const capByCategory = new Map(
    (budgetGoals ?? []).map((g) => [g.category_id, g.monthly_cap]),
  );

  return (
    <div>
      <PageHeader
        title="Profile"
        extra={
          <Link
            href="/dashboard"
            aria-label="Close profile"
            title="Close"
            className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </Link>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      )}

      {/* Hero: the one thing on this page that's about the user's actual
          objective, not settings/data plumbing — large and prominent like
          the Net/headroom heroes on Dashboard and Goals, just text instead
          of a dollar figure so no sign-tinting applies. Skipped entirely
          (not shown empty) if no goal has been set yet. */}
      {profile?.main_goal && (
        <section className="mb-4 rounded-xl bg-card p-6">
          <p className="text-xs font-medium text-foreground-muted">Your goal</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{profile.main_goal}</p>
        </section>
      )}

      <section className="mb-4 rounded-xl bg-card p-5">
        <h2 className="font-bold text-foreground">Your info</h2>
        <form action={updateProfileInfo} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted">
              Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={profile?.name ?? ""}
              className="mt-1 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted">
              Main goal
            </label>
            <input
              type="text"
              name="main_goal"
              placeholder="e.g. Save for a house, Pay off debt"
              defaultValue={profile?.main_goal ?? ""}
              className="mt-1 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
            Save
          </button>
        </form>
      </section>

      <RecurringSeriesList series={recurringSeries} categories={allCategories ?? []} />

      <ImportsSection imports={csvImports} />

      <section id="budget-goals" className="mb-10 scroll-mt-6">
        <h2 className="font-bold text-foreground">Budget Goals</h2>
        <p className="mt-1 mb-3 text-sm text-foreground-muted">
          Set a monthly spending cap for any category — leave a field blank to remove
          its goal.
        </p>
        <form action={updateBudgetGoals} className="rounded-xl bg-card">
          <div className="divide-y divide-card-border">
            {(expenseCategories ?? []).map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <label htmlFor={`budget_goal_${category.id}`} className="text-sm text-foreground">
                  {category.name}
                </label>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-sm text-foreground-muted">$</span>
                  <input
                    id={`budget_goal_${category.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    name={`budget_goal_${category.id}`}
                    defaultValue={capByCategory.get(category.id) ?? ""}
                    placeholder="No cap"
                    className="w-28 rounded-xl border border-card-border bg-input-bg px-3 py-1.5 text-right text-sm text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
              Save budget goals
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
