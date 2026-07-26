import type { createClient } from "./supabase/server";

// ±5% of a prior match's amount.
const AMOUNT_TOLERANCE = 0.05;
// "Same or very similar" description — Levenshtein-based ratio on the
// normalized (uppercased, punctuation-stripped) string. 1 = identical.
// Exported so recurring-groups.ts can reuse the same bar for the manual-
// recurrence dedup check (requirement 2 of the manual-recurrence feature).
export const SIMILARITY_THRESHOLD = 0.85;

export type RecurringInterval = "daily" | "weekly" | "biweekly" | "monthly";

// Single source of truth for every dropdown/select across the app, so
// adding/renaming an interval only needs to happen here.
export const RECURRING_INTERVALS: RecurringInterval[] = ["daily", "weekly", "biweekly", "monthly"];
export const RECURRING_INTERVAL_LABEL: Record<RecurringInterval, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

// A brand-new pattern the detector just found — not written to the DB yet.
// The caller shows this to the user and only calls confirmRecurringGroup()
// (see actions.ts) if they say yes; an already-confirmed pattern extends
// itself silently instead of producing one of these.
export type PendingRecurringCandidate = {
  transactionIds: string[];
  description: string;
  amount: number;
  type: "income" | "expense";
  interval: RecurringInterval;
};

// Date-gap buckets, each with a few days of drift allowed either side.
const INTERVAL_BUCKETS: { interval: RecurringInterval; min: number; max: number }[] = [
  { interval: "daily", min: 1, max: 2 },
  { interval: "weekly", min: 5, max: 9 },
  { interval: "biweekly", min: 11, max: 17 },
  { interval: "monthly", min: 25, max: 34 },
];

function classifyInterval(days: number): RecurringInterval | null {
  for (const bucket of INTERVAL_BUCKETS) {
    if (days >= bucket.min && days <= bucket.max) return bucket.interval;
  }
  return null;
}

function normalizeForMatch(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function descriptionSimilarity(a: string, b: string): number {
  const normA = normalizeForMatch(a);
  const normB = normalizeForMatch(b);
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(normA, normB) / maxLen;
}

export function amountsMatch(a: number, b: number): boolean {
  if (b === 0) return a === 0;
  return Math.abs(a - b) / Math.abs(b) <= AMOUNT_TOLERANCE;
}

function daysBetween(laterISO: string, earlierISO: string): number {
  const diff = new Date(laterISO).getTime() - new Date(earlierISO).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

type TxRecord = {
  id: string;
  date: string;
  description: string;
  cleaned_description: string | null;
  amount: number;
  type: "income" | "expense";
  is_recurring: boolean;
  recurring_group_id: string | null;
};

// Shared detection, called from three places: after a CSV import completes
// (with every newly-inserted id), and after a manual add or edit (with that
// one transaction's id). Re-reads the user's full history fresh each time,
// so a batch of newly-inserted rows can chain against each other as well as
// against pre-existing transactions.
//
// A pattern that's already been confirmed once (some matched transaction
// already carries a recurring_group_id) extends itself silently. A brand-new
// pattern is NOT written — it's returned so the caller can ask the user
// first; only confirmRecurringGroup() (actions.ts) commits it.
export async function detectRecurringTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactionIds: string[],
): Promise<PendingRecurringCandidate[]> {
  if (transactionIds.length === 0) return [];

  const { data: allTransactions, error } = await supabase
    .from("transactions")
    .select(
      "id, date, description, cleaned_description, amount, type, is_recurring, recurring_group_id",
    )
    .eq("user_id", userId)
    .returns<TxRecord[]>();

  if (error || !allTransactions) return [];

  // Groups the user has explicitly stopped stay stopped — a matching
  // transaction should neither silently re-extend it nor re-prompt for it.
  const { data: groups } = await supabase
    .from("recurring_groups")
    .select("id, active")
    .eq("user_id", userId)
    .returns<{ id: string; active: boolean }[]>();
  const groupActive = new Map((groups ?? []).map((g) => [g.id, g.active]));

  const byId = new Map(allTransactions.map((t) => [t.id, t]));
  // Oldest-first, so within one batch (e.g. a CSV import with three
  // occurrences of the same merchant) the chain builds up naturally as each
  // later occurrence is evaluated against the earlier ones already present.
  const targets = transactionIds
    .map((id) => byId.get(id))
    .filter((t): t is TxRecord => Boolean(t))
    .sort((a, b) => a.date.localeCompare(b.date));

  const autoExtendUpdates = new Map<
    string,
    { is_recurring: boolean; recurring_group_id: string; recurring_interval: RecurringInterval }
  >();
  // Keyed by the sorted member-id list so the same brand-new cluster found
  // via two different targets in one batch only surfaces once.
  const pendingByKey = new Map<string, PendingRecurringCandidate>();

  for (const target of targets) {
    const targetDesc = target.cleaned_description ?? target.description;

    const matches = allTransactions.filter((c) => {
      if (c.id === target.id) return false;
      if (c.type !== target.type) return false;
      const candidateDesc = c.cleaned_description ?? c.description;
      return (
        descriptionSimilarity(targetDesc, candidateDesc) >= SIMILARITY_THRESHOLD &&
        amountsMatch(target.amount, c.amount)
      );
    });

    if (matches.length < 2) continue;

    const priorMatches = matches
      .filter((c) => c.date < target.date)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (priorMatches.length < 2) continue;

    const gap = daysBetween(target.date, priorMatches[0].date);
    const interval = classifyInterval(gap);
    if (!interval) continue;

    // A matched transaction already carrying a group id means this pattern
    // was confirmed before — extend it without asking again.
    const existingGroupId =
      target.recurring_group_id ?? matches.find((m) => m.recurring_group_id)?.recurring_group_id;

    // A stopped series stays stopped — don't resurrect it just because a new
    // transaction happens to match its old pattern.
    if (existingGroupId && groupActive.get(existingGroupId) === false) {
      continue;
    }

    if (existingGroupId) {
      for (const member of [target, ...matches]) {
        autoExtendUpdates.set(member.id, {
          is_recurring: true,
          recurring_group_id: existingGroupId,
          recurring_interval: interval,
        });
      }
    } else {
      const memberIds = [target, ...matches].map((m) => m.id).sort();
      const key = memberIds.join(",");
      if (!pendingByKey.has(key)) {
        pendingByKey.set(key, {
          transactionIds: memberIds,
          description: targetDesc,
          amount: target.amount,
          type: target.type,
          interval,
        });
      }
    }
  }

  for (const [id, patch] of autoExtendUpdates) {
    const current = byId.get(id);
    if (
      current &&
      current.is_recurring === patch.is_recurring &&
      current.recurring_group_id === patch.recurring_group_id
    ) {
      continue; // already correctly tagged — skip the redundant write
    }
    await supabase.from("transactions").update(patch).eq("id", id);
  }

  return [...pendingByKey.values()];
}
