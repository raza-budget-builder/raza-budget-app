import type { createClient } from "./supabase/server";
import {
  amountsMatch,
  descriptionSimilarity,
  SIMILARITY_THRESHOLD,
  type RecurringInterval,
} from "./recurring";

export type RecurringGroup = {
  id: string;
  description: string;
  cleaned_description: string | null;
  amount: number;
  category: string | null;
  type: "income" | "expense";
  interval: RecurringInterval;
  active: boolean;
};

// Requirement 2 of manual recurrence: before creating a new series, look for
// an existing active group (AI-detected or manually created — both live in
// the same table) with a matching description/amount, so a user manually
// flagging a transaction that the detector already caught links to that
// group instead of spawning a duplicate.
export async function findMatchingActiveGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  description: string,
  amount: number,
  type: "income" | "expense",
): Promise<RecurringGroup | null> {
  const { data: groups } = await supabase
    .from("recurring_groups")
    .select("id, description, cleaned_description, amount, category, type, interval, active")
    .eq("user_id", userId)
    .eq("active", true)
    .eq("type", type)
    .returns<RecurringGroup[]>();

  if (!groups) return null;

  for (const group of groups) {
    const groupDesc = group.cleaned_description ?? group.description;
    if (
      descriptionSimilarity(description, groupDesc) >= SIMILARITY_THRESHOLD &&
      amountsMatch(amount, group.amount)
    ) {
      return group;
    }
  }
  return null;
}

// Called from addTransaction/updateTransaction when the user flips on the
// manual "This is recurring" toggle. Links the transaction to a matching
// existing group if one is found, otherwise creates a brand-new one using
// this transaction as the initial template — no confirmation popup here,
// since the user just explicitly opted in via the toggle.
export async function linkOrCreateRecurringGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  params: {
    transactionId: string;
    description: string;
    cleanedDescription: string | null;
    amount: number;
    category: string | null;
    type: "income" | "expense";
    interval: RecurringInterval;
  },
): Promise<string> {
  const existing = await findMatchingActiveGroup(
    supabase,
    userId,
    params.description,
    params.amount,
    params.type,
  );

  let groupId: string;
  let interval: RecurringInterval;

  if (existing) {
    groupId = existing.id;
    interval = existing.interval;
  } else {
    const { data: group, error } = await supabase
      .from("recurring_groups")
      .insert({
        user_id: userId,
        description: params.description,
        cleaned_description: params.cleanedDescription,
        amount: params.amount,
        category: params.category,
        type: params.type,
        interval: params.interval,
        active: true,
      })
      .select("id")
      .single();

    if (error || !group) {
      throw new Error(error?.message ?? "Failed to create recurring group");
    }
    groupId = group.id;
    interval = params.interval;
  }

  await supabase
    .from("transactions")
    .update({
      is_recurring: true,
      recurring_group_id: groupId,
      recurring_interval: interval,
    })
    .eq("id", params.transactionId);

  return groupId;
}

// Stopping prevents future pending occurrences from being generated (see
// generateDueRecurringTransactions' active-only query) but never touches
// already-confirmed past transactions — the group row itself is marked
// inactive, not deleted, so it can be reactivated later.
export async function stopRecurringGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
): Promise<void> {
  const { error } = await supabase
    .from("recurring_groups")
    .update({ active: false })
    .eq("id", groupId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function reactivateRecurringGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
): Promise<void> {
  const { error } = await supabase
    .from("recurring_groups")
    .update({ active: true })
    .eq("id", groupId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// "Apply to this and all future transactions in this series" (requirement
// 4): updates the group's canonical template so future auto-generated
// pending transactions pick up the change. "This transaction only" never
// calls this — it just updates that one transactions row instead.
export async function updateRecurringGroupTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
  patch: Partial<{
    description: string;
    cleaned_description: string | null;
    amount: number;
    category: string | null;
    interval: RecurringInterval;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from("recurring_groups")
    .update(patch)
    .eq("id", groupId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
