import type { createClient } from "./supabase/server";
import type { RecurringInterval } from "./recurring";

type RecurringGroupRecord = {
  id: string;
  description: string;
  cleaned_description: string | null;
  amount: number;
  category: string | null;
  type: "income" | "expense";
  interval: RecurringInterval;
  active: boolean;
};

type MemberTx = {
  recurring_group_id: string;
  date: string;
  status: "confirmed" | "pending";
};

export type UpcomingRecurring = {
  groupId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  interval: RecurringInterval;
  nextDate: string;
};

export type RecurringSeriesSummary = UpcomingRecurring & { active: boolean };

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// `anchorDay` is the day-of-month the series was originally meant to land
// on (pass the earliest member transaction's day) — a month too short for
// that day (Feb for anything past 28, or any 30-day month for a day-31
// series) clamps to that month's real last day instead of JS's default
// Date.setMonth overflow behavior (e.g. Jan 31 + 1 month silently becomes
// Mar 3, skipping February and permanently drifting off the 31st forever
// after, since a plain date-chained implementation never sees 31 again).
// Recomputing the anchor fresh each call (rather than chaining off the
// previous occurrence's actual date) means the series bounces back to the
// intended day the next time a long-enough month comes around — Jan 31 ->
// Feb 28 -> Mar 31, not Jan 31 -> Feb 28 -> Mar 28. Falls back to the
// passed-in date's own day if no anchor is given.
export function addInterval(
  dateISO: string,
  interval: RecurringInterval,
  anchorDay?: number,
): string {
  const d = new Date(`${dateISO}T00:00:00`);
  if (interval === "weekly") {
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  if (interval === "biweekly") {
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }

  const targetDay = anchorDay ?? d.getDate();
  let targetYear = d.getFullYear();
  let targetMonth = d.getMonth() + 1; // 0-indexed month, one step forward
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  const clampedDay = Math.min(targetDay, daysInMonth(targetYear, targetMonth));
  return `${targetYear}-${pad2(targetMonth + 1)}-${pad2(clampedDay)}`;
}

// The day-of-month a series was originally meant to land on — the earliest
// member transaction's date, regardless of status, since a pending
// prediction's date already reflects a correctly-clamped target day and is
// harmless to include as a candidate.
function anchorDayOf(members: MemberTx[]): number {
  const earliest = members.map((m) => m.date).sort((a, b) => a.localeCompare(b))[0];
  return Number(earliest.slice(8, 10));
}

async function fetchGroupsWithMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options: { activeOnly: boolean },
) {
  let query = supabase
    .from("recurring_groups")
    .select("id, description, cleaned_description, amount, category, type, interval, active")
    .eq("user_id", userId);
  if (options.activeOnly) query = query.eq("active", true);
  const { data: groups } = await query.returns<RecurringGroupRecord[]>();

  if (!groups || groups.length === 0) return { groups: [], byGroup: new Map<string, MemberTx[]>() };

  const groupIds = groups.map((g) => g.id);
  const { data: members } = await supabase
    .from("transactions")
    .select("recurring_group_id, date, status")
    .eq("user_id", userId)
    .in("recurring_group_id", groupIds)
    .returns<MemberTx[]>();

  const byGroup = new Map<string, MemberTx[]>();
  for (const m of members ?? []) {
    const list = byGroup.get(m.recurring_group_id) ?? [];
    list.push(m);
    byGroup.set(m.recurring_group_id, list);
  }

  return { groups, byGroup };
}

// Check-on-open generation (no backend scheduler exists): for every active
// recurring group with no already-unresolved pending prediction, see whether
// the next expected occurrence (last known transaction date + interval) has
// arrived, and if so, insert it as a `status: pending` transaction using the
// group's current template (amount/description/category — the same template
// a "this and future" edit updates). Called once per request from the shared
// (app) layout, so it effectively runs on every app load/navigation.
export async function generateDueRecurringTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const { groups, byGroup } = await fetchGroupsWithMembers(supabase, userId, { activeOnly: true });
  if (groups.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const toInsert: Record<string, unknown>[] = [];

  for (const group of groups) {
    const members = byGroup.get(group.id) ?? [];
    if (members.length === 0) continue; // no anchor transaction yet — nothing to project from

    // Already has an unconfirmed prediction sitting there — don't stack
    // another one on top of it.
    if (members.some((m) => m.status === "pending")) continue;

    const confirmedDates = members
      .filter((m) => m.status === "confirmed")
      .map((m) => m.date)
      .sort((a, b) => b.localeCompare(a));
    const lastDate = confirmedDates[0];
    if (!lastDate) continue;

    const nextDate = addInterval(lastDate, group.interval, anchorDayOf(members));
    if (nextDate > today) continue; // not due yet

    // Defensive: a transaction already logged for that exact date (e.g. the
    // user entered it manually before this check ran) means nothing to do.
    if (members.some((m) => m.date === nextDate)) continue;

    toInsert.push({
      user_id: userId,
      date: nextDate,
      description: group.description,
      cleaned_description: group.cleaned_description,
      amount: group.amount,
      type: group.type,
      category: group.category,
      source: "manual",
      confirmed: true,
      status: "pending",
      is_recurring: true,
      recurring_group_id: group.id,
      recurring_interval: group.interval,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("transactions").insert(toInsert);
  }
}

// For the "Upcoming" section: next expected date per active series,
// regardless of whether it's already due, sorted soonest first.
export async function computeUpcomingRecurring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<UpcomingRecurring[]> {
  const { groups, byGroup } = await fetchGroupsWithMembers(supabase, userId, { activeOnly: true });
  if (groups.length === 0) return [];

  const upcoming: UpcomingRecurring[] = [];

  for (const group of groups) {
    const members = byGroup.get(group.id) ?? [];
    if (members.length === 0) continue;

    const dates = members.map((m) => m.date).sort((a, b) => b.localeCompare(a));
    const lastDate = dates[0];
    upcoming.push({
      groupId: group.id,
      description: group.description,
      amount: group.amount,
      type: group.type,
      category: group.category,
      interval: group.interval,
      nextDate: addInterval(lastDate, group.interval, anchorDayOf(members)),
    });
  }

  upcoming.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  return upcoming;
}

// Every series (active + stopped) for the Profile page's expandable list.
// Stopped series have no due-generation running, but still show their last
// projected next-date so the entry reads coherently even greyed out.
export async function listRecurringSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<RecurringSeriesSummary[]> {
  const { groups, byGroup } = await fetchGroupsWithMembers(supabase, userId, { activeOnly: false });
  if (groups.length === 0) return [];

  const series: RecurringSeriesSummary[] = [];

  for (const group of groups) {
    const members = byGroup.get(group.id) ?? [];
    const dates = members.map((m) => m.date).sort((a, b) => b.localeCompare(a));
    const lastDate = dates[0];
    series.push({
      groupId: group.id,
      description: group.description,
      amount: group.amount,
      type: group.type,
      category: group.category,
      interval: group.interval,
      active: group.active,
      nextDate: lastDate ? addInterval(lastDate, group.interval, anchorDayOf(members)) : "",
    });
  }

  series.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.nextDate.localeCompare(b.nextDate);
  });
  return series;
}
