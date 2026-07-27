"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isIncomeType } from "@/lib/income-type";

export async function updateProfileInfo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim() || null;
  const mainGoal = (formData.get("main_goal") as string)?.trim() || null;
  const incomeType = formData.getAll("income_type").filter(
    (v): v is string => typeof v === "string" && isIncomeType(v),
  );

  // .select() forces the update to return its written row — same fix as
  // updateBudgetGoals below, guarding against the same write/re-read race.
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      main_goal: mainGoal,
      income_type: incomeType.length > 0 ? incomeType : null,
    })
    .eq("id", user.id)
    .select();

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
}

export async function updateBudgetGoals(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id")
    .eq("type", "expense");

  if (categoriesError) {
    redirect(`/profile?error=${encodeURIComponent(categoriesError.message)}`);
  }

  const toUpsert: { user_id: string; category_id: string; monthly_cap: number }[] = [];
  const toClearCategoryIds: string[] = [];

  for (const category of categories ?? []) {
    const raw = formData.get(`budget_goal_${category.id}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    const cap = Number(value);

    if (value === "" || !Number.isFinite(cap) || cap <= 0) {
      // Blank (or invalid/zero) input means "no goal" — clear any existing one.
      toClearCategoryIds.push(category.id);
    } else {
      toUpsert.push({ user_id: user.id, category_id: category.id, monthly_cap: cap });
    }
  }

  if (toUpsert.length > 0) {
    // .select() forces the upsert to return its written rows — without it,
    // this occasionally raced the redirect/revalidate below and the Profile
    // page's next read wouldn't see the write yet.
    const { error } = await supabase
      .from("budget_goals")
      .upsert(toUpsert, { onConflict: "user_id,category_id" })
      .select();
    if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  if (toClearCategoryIds.length > 0) {
    const { error } = await supabase
      .from("budget_goals")
      .delete()
      .eq("user_id", user.id)
      .in("category_id", toClearCategoryIds)
      .select();
    if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/insights");
}
