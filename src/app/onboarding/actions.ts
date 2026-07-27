"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isIncomeType, type IncomeType } from "@/lib/income-type";

export async function completeOnboarding(params: {
  incomeType: IncomeType[];
  mainGoal: string;
  acceptedTier: "entrepreneur" | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const incomeType = params.incomeType.filter(isIncomeType);
  const mainGoal = params.mainGoal.trim();

  const update: {
    income_type: IncomeType[] | null;
    main_goal: string | null;
    onboarding_completed_at: string;
    tier?: "entrepreneur";
  } = {
    income_type: incomeType.length > 0 ? incomeType : null,
    main_goal: mainGoal || null,
    onboarding_completed_at: new Date().toISOString(),
  };
  if (params.acceptedTier) update.tier = params.acceptedTier;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id).select();
  if (error) {
    // Nothing graceful to show mid-flow — log and let them into the app
    // rather than strand them on an onboarding screen that can't proceed.
    console.error("onboarding completion failed", error);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// A full skip still marks onboarding done — "skippable" means permanently
// dismissible, not "ask again next login."
export async function skipOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id)
    .select();

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
