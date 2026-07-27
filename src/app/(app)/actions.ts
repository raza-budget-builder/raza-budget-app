"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  detectRecurringTransactions,
  type PendingRecurringCandidate,
  type RecurringInterval,
} from "@/lib/recurring";
import { findPossibleDuplicate, type DuplicateCandidate } from "@/lib/duplicate-detection";
import {
  linkOrCreateRecurringGroup,
  reactivateRecurringGroup,
  stopRecurringGroup,
  updateRecurringGroupTemplate,
} from "@/lib/recurring-groups";

export async function addTransaction(
  formData: FormData,
): Promise<{
  possibleDuplicate: DuplicateCandidate | null;
  pendingRecurring: PendingRecurringCandidate | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const category = formData.get("category") as string;
  const type = formData.get("type") as string;
  const isRecurring = formData.get("isRecurring") === "on";
  const recurringInterval = formData.get("recurringInterval") as RecurringInterval | null;
  const confirmDuplicate = formData.get("confirmDuplicate") === "true";

  // Flag-and-confirm, not block: check once, then let the resubmit (with
  // confirmDuplicate set) through unconditionally rather than re-checking
  // and risking a loop the user can't get past.
  if (!confirmDuplicate) {
    const { data: sameDay } = await supabase
      .from("transactions")
      .select("id, date, description, amount, cleaned_description, category:categories(id, name)")
      .eq("user_id", user.id)
      .eq("date", date)
      .returns<
        {
          id: string;
          date: string;
          description: string;
          amount: number;
          cleaned_description: string | null;
          category: { id: string; name: string } | null;
        }[]
      >();

    const possibleDuplicate = findPossibleDuplicate(sameDay ?? [], {
      date,
      amount: Number(amount),
      description,
      categoryId: category || null,
    });
    if (possibleDuplicate) {
      return { possibleDuplicate, pendingRecurring: null };
    }
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      date,
      description,
      amount: Number(amount),
      category: category || null,
      type,
      source: "manual",
      confirmed: true,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  // Manual recurrence (requirement 1/2 of the manual-recurrence feature)
  // fully handles its own group linking/creation — the passive AI detector
  // below is only relevant when the user didn't just explicitly opt in.
  let pendingRecurring;
  if (inserted && isRecurring && recurringInterval) {
    await linkOrCreateRecurringGroup(supabase, user.id, {
      transactionId: inserted.id,
      description,
      cleanedDescription: null,
      amount: Number(amount),
      category: category || null,
      type: type as "income" | "expense",
      interval: recurringInterval,
    });
  } else if (inserted) {
    pendingRecurring = (await detectRecurringTransactions(supabase, user.id, [inserted.id]))[0];
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return { possibleDuplicate: null, pendingRecurring: pendingRecurring ?? null };
}

// scope only matters when the transaction is already part of a recurring
// series and a template field (amount/category/description/interval)
// changed: "this" touches only this transaction's own row, "future" also
// updates the group's template so future auto-generated occurrences pick up
// the change (requirement 4 of the manual-recurrence feature). It's the
// server-side half of TransactionRow's scope-choice modal.
export async function updateTransaction(
  id: string,
  formData: FormData,
  scope?: "this" | "future",
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const category = formData.get("category") as string;
  const type = formData.get("type") as string;
  const isRecurring = formData.get("isRecurring") === "on";
  const recurringInterval = formData.get("recurringInterval") as RecurringInterval | null;

  const { data: current } = await supabase
    .from("transactions")
    .select("recurring_group_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("transactions")
    .update({
      date,
      description,
      amount: Number(amount),
      category: category || null,
      type,
      // Saving an edit — including editing a pending recurring prediction
      // before accepting it — always confirms the transaction.
      status: "confirmed",
    })
    .eq("id", id)
    .select();

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  let pendingRecurring;

  if (current?.recurring_group_id) {
    // Already part of a series — never re-run the dedup lookup, always
    // keep using its existing group. Only the "apply to future" choice
    // pushes the edited fields into the group's canonical template.
    if (scope === "future") {
      await updateRecurringGroupTemplate(supabase, user.id, current.recurring_group_id, {
        description,
        amount: Number(amount),
        category: category || null,
        ...(recurringInterval ? { interval: recurringInterval } : {}),
      });
    }
  } else if (isRecurring && recurringInterval) {
    await linkOrCreateRecurringGroup(supabase, user.id, {
      transactionId: id,
      description,
      cleanedDescription: null,
      amount: Number(amount),
      category: category || null,
      type: type as "income" | "expense",
      interval: recurringInterval,
    });
  } else {
    pendingRecurring = (await detectRecurringTransactions(supabase, user.id, [id]))[0];
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return { pendingRecurring: pendingRecurring ?? null };
}

export async function confirmCategory(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const category = formData.get("category") as string;

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("type")
    .eq("id", category)
    .single();

  if (categoryError) {
    redirect(`/dashboard?error=${encodeURIComponent(categoryError.message)}`);
  }

  const { error } = await supabase
    .from("transactions")
    .update({ category, type: categoryRow!.type, confirmed: true })
    .eq("id", id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function bulkConfirmCategory(ids: string[], categoryId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (ids.length === 0 || !categoryId) return;

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("type")
    .eq("id", categoryId)
    .single();

  if (categoryError) {
    redirect(`/dashboard?error=${encodeURIComponent(categoryError.message)}`);
  }

  const { error } = await supabase
    .from("transactions")
    .update({ category: categoryId, type: categoryRow!.type, confirmed: true })
    .in("id", ids);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function deleteTransactions(ids: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (ids.length === 0) return;

  const { error } = await supabase.from("transactions").delete().in("id", ids);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function bulkUpdateTransactions(
  ids: string[],
  updates: { category?: string; type?: "income" | "expense" },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (ids.length === 0) return;

  const patch: { category?: string; type?: "income" | "expense"; confirmed?: boolean } =
    {};
  if (updates.category) {
    patch.category = updates.category;
    patch.confirmed = true;
  }
  if (updates.type) {
    patch.type = updates.type;
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("transactions").update(patch).in("id", ids);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

// Commits a brand-new recurring pattern the user just confirmed in the
// pop-up — detectRecurringTransactions() never writes one of these on its
// own, precisely so the first occurrence of a pattern gets a human "yes".
export async function confirmRecurringGroup(transactionIds: string[], interval: RecurringInterval) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (transactionIds.length === 0) return;

  const { data: members, error: fetchError } = await supabase
    .from("transactions")
    .select("id, date, description, cleaned_description, amount, type, category")
    .in("id", transactionIds)
    .returns<
      {
        id: string;
        date: string;
        description: string;
        cleaned_description: string | null;
        amount: number;
        type: "income" | "expense";
        category: string | null;
      }[]
    >();

  if (fetchError || !members || members.length === 0) {
    redirect(`/dashboard?error=${encodeURIComponent(fetchError?.message ?? "Not found")}`);
  }

  const latest = [...members].sort((a, b) => b.date.localeCompare(a.date))[0];

  const { data: group, error: groupError } = await supabase
    .from("recurring_groups")
    .insert({
      user_id: user.id,
      description: latest.description,
      cleaned_description: latest.cleaned_description,
      amount: latest.amount,
      category: latest.category,
      type: latest.type,
      interval,
      active: true,
    })
    .select("id")
    .single();

  if (groupError || !group) {
    redirect(`/dashboard?error=${encodeURIComponent(groupError?.message ?? "Failed to create group")}`);
  }

  const { error } = await supabase
    .from("transactions")
    .update({ is_recurring: true, recurring_group_id: group.id, recurring_interval: interval })
    .in("id", transactionIds);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

// Accepts an auto-generated recurring prediction as-is — the checkmark half
// of the pending-row pill. Editing-then-saving (the pencil half) goes
// through updateTransaction instead, which confirms as part of the save.
export async function confirmPendingTransaction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("transactions")
    .update({ status: "confirmed" })
    .eq("id", id)
    .select();

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

// Stops a series without deleting it (requirement 3): future pending
// occurrences stop being generated (generateDueRecurringTransactions only
// looks at active groups), but past confirmed transactions are untouched.
export async function stopRecurringGroupAction(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await stopRecurringGroup(supabase, user.id, groupId);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/profile");
}

export async function reactivateRecurringGroupAction(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await reactivateRecurringGroup(supabase, user.id, groupId);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/profile");
}

// Profile page's expandable recurring-series list edits a group's template
// directly (amount/category/interval) — there's no single "this
// transaction" context there, so unlike updateTransaction's scope choice,
// this always applies to future occurrences.
export async function updateRecurringGroupAction(
  groupId: string,
  patch: { amount?: number; category?: string | null; interval?: RecurringInterval },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await updateRecurringGroupTemplate(supabase, user.id, groupId, patch);

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
