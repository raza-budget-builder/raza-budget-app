import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { createClient } from "./supabase/server";

const anthropic = new Anthropic();

const DriftAlertsSchema = z.object({
  alerts: z
    .array(
      z.object({
        text: z.string().describe("One short, specific sentence, talking to the user as 'you'."),
        category: z
          .string()
          .nullable()
          .describe(
            "The exact category name this alert is about, matching one of the category " +
              "names given in the data — or null if it's a general/multi-category observation.",
          ),
        sentiment: z
          .enum(["positive", "negative"])
          .describe(
            "'positive' for good news (spending down, saved more, no concerning change) — " +
              "'negative' for a concerning change (spending up, a new subscription, a price increase).",
          ),
      }),
    )
    .min(1)
    .max(4),
});

// Anything smaller than this (in either the current month or the average
// being compared against) is too small in dollar terms to be worth
// flagging, even if the ratio looks dramatic (e.g. $2 -> $6 is "3x" but not
// actually notable).
const MIN_NOTABLE_AMOUNT = 20;
const PRICE_INCREASE_THRESHOLD = 0.08; // 8%+
const TOP_CATEGORY_COUNT = 8;

function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string } | null;
};

export type CategoryDriftEntry = {
  categoryName: string;
  currentMonthSpend: number;
  avg1mo: number;
  avg3mo: number;
  avg6mo: number;
  avg12mo: number;
  maxDeviation: number;
};

// For each expense category, compares this month's spend against that same
// category's own trailing average over the last 1/3/6/12 months — "under/
// over the average of the last month, 3 months, 6 months, or rolling year"
// per the spec. A category absent from a given month simply counts as $0
// spend that month, so a brand-new category shows up as an (effectively
// infinite) deviation rather than being silently skipped.
export function computeCategoryDrift(
  transactions: Transaction[],
  currentMonth: string,
): CategoryDriftEntry[] {
  const spendByCategory = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category) continue;
    const byMonth = spendByCategory.get(t.category.name) ?? new Map<string, number>();
    byMonth.set(monthKey(t.date), (byMonth.get(monthKey(t.date)) ?? 0) + Number(t.amount));
    spendByCategory.set(t.category.name, byMonth);
  }

  function windowAverage(byMonth: Map<string, number>, months: number): number {
    let sum = 0;
    for (let i = 1; i <= months; i++) {
      sum += byMonth.get(addMonths(currentMonth, -i)) ?? 0;
    }
    return sum / months;
  }

  function deviation(currentMonthSpend: number, avg: number): number {
    if (avg <= 0) return currentMonthSpend > 0 ? Infinity : 0;
    return Math.abs(currentMonthSpend / avg - 1);
  }

  const entries: CategoryDriftEntry[] = [];
  for (const [categoryName, byMonth] of spendByCategory) {
    const currentMonthSpend = byMonth.get(currentMonth) ?? 0;
    const avg1mo = windowAverage(byMonth, 1);
    const avg3mo = windowAverage(byMonth, 3);
    const avg6mo = windowAverage(byMonth, 6);
    const avg12mo = windowAverage(byMonth, 12);

    if (Math.max(currentMonthSpend, avg3mo, avg6mo, avg12mo) < MIN_NOTABLE_AMOUNT) continue;

    const maxDeviation = Math.max(
      deviation(currentMonthSpend, avg1mo),
      deviation(currentMonthSpend, avg3mo),
      deviation(currentMonthSpend, avg6mo),
      deviation(currentMonthSpend, avg12mo),
    );

    entries.push({ categoryName, currentMonthSpend, avg1mo, avg3mo, avg6mo, avg12mo, maxDeviation });
  }

  entries.sort((a, b) => b.maxDeviation - a.maxDeviation);
  return entries;
}

export type NewSubscriptionSignal = {
  description: string;
  categoryName: string | null;
  amount: number;
  interval: string;
  startedMonth: string;
};

type RecurringGroupRow = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  interval: string;
  active: boolean;
  created_at: string;
  category: { name: string } | null;
};

// A series created this month or last — recent enough to be "new" without
// disappearing from view the instant the calendar rolls over.
export function detectNewSubscriptions(
  groups: RecurringGroupRow[],
  currentMonth: string,
): NewSubscriptionSignal[] {
  return groups
    .filter((g) => g.active && g.type === "expense")
    .filter((g) => {
      const createdMonth = monthKey(g.created_at);
      return createdMonth === currentMonth || createdMonth === addMonths(currentMonth, -1);
    })
    .map((g) => ({
      description: g.description,
      categoryName: g.category?.name ?? null,
      amount: g.amount,
      interval: g.interval,
      startedMonth: monthKey(g.created_at),
    }));
}

export type PriceIncreaseSignal = {
  description: string;
  categoryName: string | null;
  oldAmount: number;
  newAmount: number;
  increasePercent: number;
};

// Compares each series' current template amount (which "apply to future"
// edits and silent AI-detected auto-extension both keep up to date) against
// the amount of its very first known occurrence — a rising gap between the
// two means the price crept up at some point since the user started paying it.
export function detectPriceIncreases(
  groups: RecurringGroupRow[],
  oldestAmountByGroup: Map<string, number>,
): PriceIncreaseSignal[] {
  const signals: PriceIncreaseSignal[] = [];
  for (const g of groups) {
    if (!g.active || g.type !== "expense") continue;
    const oldestAmount = oldestAmountByGroup.get(g.id);
    if (oldestAmount === undefined || oldestAmount <= 0) continue;
    const increaseRatio = (g.amount - oldestAmount) / oldestAmount;
    if (increaseRatio >= PRICE_INCREASE_THRESHOLD) {
      signals.push({
        description: g.description,
        categoryName: g.category?.name ?? null,
        oldAmount: oldestAmount,
        newAmount: g.amount,
        increasePercent: Math.round(increaseRatio * 100),
      });
    }
  }
  return signals;
}

export type DriftAlertItem = {
  text: string;
  category: string | null;
  sentiment: "positive" | "negative";
};

export type DriftAlerts = {
  month: string;
  alerts: DriftAlertItem[] | null;
};

export async function getDriftAlerts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<DriftAlerts> {
  const month = new Date().toISOString().slice(0, 7);
  const historyStart = `${addMonths(month, -12)}-01`;

  const [{ data: transactions }, { data: groups }, { data: memberTx }] = await Promise.all([
    supabase
      .from("transactions")
      .select("date, amount, type, category:categories(name)")
      .gte("date", historyStart)
      // Pending recurring predictions aren't real spend yet.
      .neq("status", "pending")
      .returns<Transaction[]>(),
    supabase
      .from("recurring_groups")
      .select("id, description, amount, type, interval, active, created_at, category:categories(name)")
      .eq("user_id", userId)
      .returns<RecurringGroupRow[]>(),
    supabase
      .from("transactions")
      .select("recurring_group_id, amount")
      .eq("user_id", userId)
      .not("recurring_group_id", "is", null)
      .order("date", { ascending: true })
      .returns<{ recurring_group_id: string; amount: number }[]>(),
  ]);

  const allTransactions = transactions ?? [];
  const allGroups = groups ?? [];

  // Need at least a couple of months of history for a trailing average to
  // mean anything at all.
  const distinctMonths = new Set(allTransactions.map((t) => monthKey(t.date)));
  if (distinctMonths.size < 2) {
    return { month, alerts: null };
  }

  const oldestAmountByGroup = new Map<string, number>();
  for (const t of memberTx ?? []) {
    if (!oldestAmountByGroup.has(t.recurring_group_id)) {
      oldestAmountByGroup.set(t.recurring_group_id, Number(t.amount));
    }
  }

  const driftEntries = computeCategoryDrift(allTransactions, month).slice(0, TOP_CATEGORY_COUNT);
  const newSubscriptions = detectNewSubscriptions(allGroups, month);
  const priceIncreases = detectPriceIncreases(allGroups, oldestAmountByGroup);

  if (driftEntries.length === 0 && newSubscriptions.length === 0 && priceIncreases.length === 0) {
    return { month, alerts: null };
  }

  const signature = [
    driftEntries
      .map(
        (e) =>
          `${e.categoryName}:${e.currentMonthSpend.toFixed(2)}:${e.avg3mo.toFixed(2)}:${e.avg6mo.toFixed(2)}`,
      )
      .sort()
      .join(","),
    newSubscriptions
      .map((s) => `${s.description}:${s.amount.toFixed(2)}`)
      .sort()
      .join(","),
    priceIncreases
      .map((p) => `${p.description}:${p.newAmount.toFixed(2)}`)
      .sort()
      .join(","),
  ].join("|");

  const { data: cached } = await supabase
    .from("drift_alert_summaries")
    .select("bullets, signature")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (cached && cached.signature === signature) {
    return { month, alerts: cached.bullets as DriftAlertItem[] };
  }

  const categoryLines = driftEntries
    .map(
      (e) =>
        `${e.categoryName}: $${e.currentMonthSpend.toFixed(0)} this month ` +
        `(1mo avg $${e.avg1mo.toFixed(0)}, 3mo avg $${e.avg3mo.toFixed(0)}, ` +
        `6mo avg $${e.avg6mo.toFixed(0)}, 12mo avg $${e.avg12mo.toFixed(0)})`,
    )
    .join("\n");
  const subscriptionLines = newSubscriptions
    .map(
      (s) =>
        `${s.description} (${s.categoryName ?? "uncategorized"}): $${s.amount.toFixed(2)} ` +
        `${s.interval}, started ${s.startedMonth}`,
    )
    .join("\n");
  const priceLines = priceIncreases
    .map(
      (p) =>
        `${p.description} (${p.categoryName ?? "uncategorized"}): was $${p.oldAmount.toFixed(2)}, ` +
        `now $${p.newAmount.toFixed(2)} (+${p.increasePercent}%)`,
    )
    .join("\n");

  try {
    const response = await anthropic.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: zodOutputFormat(DriftAlertsSchema),
      },
      messages: [
        {
          role: "user",
          content:
            `Here's a person's spending-category breakdown for this month compared to ` +
            `their own trailing averages, plus some detected recurring-payment signals. ` +
            `Identify the most notable changes — things they may not have noticed, like a ` +
            `category spending way more or less than usual, a brand-new subscription, a ` +
            `recurring payment whose price crept up, or a broader lifestyle-creep trend ` +
            `across categories. Write 3-4 short, specific alerts, each one sentence, plain ` +
            `language, talking to them directly as "you". For each one, name the single ` +
            `category name it's most about (exactly as given below — e.g. "Dining Out", ` +
            `not a paraphrase), or null if it's a general/multi-category observation. Also ` +
            `mark each as "positive" or "negative": spending MORE than usual in an expense ` +
            `category, a new subscription, or a price increase are negative; spending LESS ` +
            `than usual, or a category coming back down, is positive. Only mention what's ` +
            `genuinely notable in the data below — don't invent anything and don't mention ` +
            `categories that aren't listed.\n\n` +
            `Category spend this month vs. trailing averages:\n${categoryLines || "(none notable)"}` +
            (subscriptionLines
              ? `\n\nNew recurring subscriptions detected:\n${subscriptionLines}`
              : "") +
            (priceLines
              ? `\n\nRecurring payments that appear to have increased in price:\n${priceLines}`
              : ""),
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("No parsed output from Claude");

    await supabase
      .from("drift_alert_summaries")
      .upsert(
        { user_id: userId, month, signature, bullets: parsed.alerts },
        { onConflict: "user_id,month" },
      );

    return { month, alerts: parsed.alerts };
  } catch (err) {
    console.error("drift alerts generation failed", err);
    if (cached) return { month, alerts: cached.bullets as DriftAlertItem[] };
    return { month, alerts: null };
  }
}
