import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { createClient } from "./supabase/server";
import { buildCategoryTotals } from "./category-spend";
import { buildBudgetSplit } from "./budget-split";
import { buildCumulativeNetFlow } from "./net-flow";
import {
  computeBiggestSwings,
  computeMonthOverMonthComparison,
  computePaceProjections,
} from "./dashboard-insights";
import { computeCategoryDrift } from "./drift-alerts";
import { getGoalPerformance } from "./goal-performance";
import { getPeriodRange, PERIOD_OPTIONS, type PeriodKey } from "./date-ranges";

export type ChatTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string; name: string; budget_group: string | null } | null;
};
export type ChatCategory = { id: string; name: string; type: "income" | "expense" };
export type ChatGoal = { category_id: string; monthly_cap: number };

export type ChatToolContext = {
  transactions: ChatTransaction[];
  goals: ChatGoal[];
  categories: ChatCategory[];
  today: Date;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

const PERIOD_KEYS = PERIOD_OPTIONS.map((o) => o.value) as [PeriodKey, ...PeriodKey[]];

// Every period-taking tool accepts either one of the app's standard presets
// (resolved via getPeriodRange, same as the rest of the UI) or an explicit
// ISO range for anything else ("March", "Q1") — Claude computes the latter
// itself from "today" in the system prompt, so there's no separate
// date-parsing tool/round-trip.
const PeriodOrRangeSchema = z.union([
  z.object({ preset: z.enum(PERIOD_KEYS).describe("One of the app's standard period presets.") }),
  z.object({
    start: z.string().describe("ISO date YYYY-MM-DD, inclusive."),
    end: z.string().describe("ISO date YYYY-MM-DD, inclusive."),
  }),
]);
type PeriodOrRange = z.infer<typeof PeriodOrRangeSchema>;

function resolvePeriod(input: PeriodOrRange, today: Date): { start: string; end: string } {
  return "preset" in input ? getPeriodRange(input.preset, today) : input;
}

function inRange(t: { date: string }, range: { start: string; end: string }): boolean {
  return t.date >= range.start && t.date <= range.end;
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function buildChatTools(ctx: ChatToolContext) {
  const getCategorySpend = betaZodTool({
    name: "get_category_spend",
    description:
      "Get total spend (or income) per category for a given period. Use this for questions " +
      "about how much was spent in a category, or a category breakdown for a period.",
    inputSchema: z.object({
      period: PeriodOrRangeSchema,
      type: z.enum(["income", "expense"]).optional().describe("Defaults to 'expense'."),
      categoryName: z
        .string()
        .optional()
        .describe("If given, only return this one category's total instead of all of them."),
    }),
    run: async ({ period, type, categoryName }) => {
      const range = resolvePeriod(period, ctx.today);
      const filtered = ctx.transactions.filter((t) => inRange(t, range));
      const totals = buildCategoryTotals(filtered, type ?? "expense");
      const result = categoryName
        ? totals.filter((c) => c.name.toLowerCase() === categoryName.toLowerCase())
        : totals;
      return JSON.stringify({ range, totals: result });
    },
  });

  const getBudgetSplit = betaZodTool({
    name: "get_budget_split",
    description:
      "Get the 50/30/20 needs/wants/savings breakdown for a period — use this for questions " +
      "about whether spending fits the needs/wants/savings split.",
    inputSchema: z.object({ period: PeriodOrRangeSchema }),
    run: async ({ period }) => {
      const range = resolvePeriod(period, ctx.today);
      const filtered = ctx.transactions.filter((t) => inRange(t, range));
      return JSON.stringify({ range, ...buildBudgetSplit(filtered) });
    },
  });

  const getNetFlowTrend = betaZodTool({
    name: "get_net_flow_trend",
    description:
      "Get the month-by-month net (income minus expenses) and running cumulative total across " +
      "the user's full available history. Use this for savings-trend or net-worth-trend " +
      "questions.",
    inputSchema: z.object({
      monthsBack: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("If given, only return the most recent N months instead of the full trend."),
    }),
    run: async ({ monthsBack }) => {
      const points = buildCumulativeNetFlow(ctx.transactions);
      const result = monthsBack ? points.slice(-monthsBack) : points;
      return JSON.stringify(result);
    },
  });

  const getPaceToGoal = betaZodTool({
    name: "get_pace_to_goal",
    description:
      "Get this month's spend-so-far vs. budget goal cap per category, with a projected " +
      "month-end total. Use this for 'am I on track' or 'will I go over budget' questions.",
    inputSchema: z.object({
      categoryName: z.string().optional().describe("If given, only return this category."),
    }),
    run: async ({ categoryName }) => {
      const projections = computePaceProjections(
        ctx.transactions,
        ctx.goals,
        ctx.categories,
        ctx.today,
      );
      const result = categoryName
        ? projections.filter((p) => p.categoryName.toLowerCase() === categoryName.toLowerCase())
        : projections;
      return JSON.stringify(result);
    },
  });

  const getMonthOverMonthComparison = betaZodTool({
    name: "get_month_over_month_comparison",
    description:
      "Compare this month so far to the same number of elapsed days last month, for income or " +
      "expenses. Use this for 'this month vs last month' questions.",
    inputSchema: z.object({ type: z.enum(["income", "expense"]) }),
    run: async ({ type }) => {
      return JSON.stringify(computeMonthOverMonthComparison(ctx.transactions, type, ctx.today));
    },
  });

  const getBiggestSwings = betaZodTool({
    name: "get_biggest_category_swings",
    description:
      "Get the categories with the biggest dollar change vs. their own trailing 3-month " +
      "average this month. Use this for 'what changed' or 'what's different this month' " +
      "questions.",
    inputSchema: z.object({}),
    run: async () => {
      return JSON.stringify(computeBiggestSwings(ctx.transactions, ctx.categories, ctx.today));
    },
  });

  const getCategoryDrift = betaZodTool({
    name: "get_category_drift",
    description:
      "Get each category's spend this month vs. its own trailing 1/3/6/12-month averages. Use " +
      "this for longer-horizon 'is this normal for me' or spending-habit questions, as opposed " +
      "to get_biggest_category_swings which only looks at the 3-month average.",
    inputSchema: z.object({}),
    run: async () => {
      return JSON.stringify(computeCategoryDrift(ctx.transactions, monthKey(ctx.today)));
    },
  });

  const searchTransactions = betaZodTool({
    name: "search_transactions",
    description:
      "Look up individual transactions matching filters — use this when the user asks to see " +
      "specific charges/transactions (e.g. 'show me my Uber charges'), not for totals (use " +
      "get_category_spend for totals instead). Results are capped at 50 rows, most recent first.",
    inputSchema: z.object({
      period: PeriodOrRangeSchema.optional(),
      categoryName: z.string().optional(),
      descriptionContains: z.string().optional().describe("Case-insensitive substring match."),
      type: z.enum(["income", "expense"]).optional(),
      limit: z.number().int().positive().optional().describe("Defaults to 20, capped at 50."),
    }),
    run: async ({ period, categoryName, descriptionContains, type, limit }) => {
      const range = period ? resolvePeriod(period, ctx.today) : null;
      const needle = descriptionContains?.toLowerCase();

      const filtered = ctx.transactions.filter((t) => {
        if (range && !inRange(t, range)) return false;
        if (type && t.type !== type) return false;
        if (categoryName && t.category?.name.toLowerCase() !== categoryName.toLowerCase()) {
          return false;
        }
        if (needle && !t.description.toLowerCase().includes(needle)) return false;
        return true;
      });

      const cap = Math.min(limit ?? 20, 50);
      const rows = filtered
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, cap)
        .map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category?.name ?? null,
        }));

      return JSON.stringify({ matchCount: filtered.length, returned: rows.length, rows });
    },
  });

  // Appending the sentinel unconditionally guarantees at least one element,
  // so this is always a valid non-empty tuple for z.enum regardless of
  // whether the user has any categories.
  const categoryNames: string[] = [...ctx.categories.map((c) => c.name), "Uncategorized"];
  const categoryEnumValues = categoryNames as [string, ...string[]];

  const recordTransaction = betaZodTool({
    name: "record_transaction",
    description:
      "Record a new transaction the user described in natural language, e.g. 'I spent $40.22 " +
      "at Walmart on groceries'. Only call this once you have the amount, a description/" +
      "vendor, AND a clear, unambiguous category — if any of those is missing, or the category " +
      "could plausibly be more than one thing (e.g. a snack at a pharmacy could be Dining Out " +
      "or Groceries), ask the user instead of calling this tool with a guess. Nothing is " +
      "recorded until you're sure, so an unanswered question simply has no effect — there's no " +
      "downside to asking. Today's date is used if the user didn't mention one.",
    inputSchema: z.object({
      amount: z.number().positive().describe("The transaction amount, always positive."),
      description: z
        .string()
        .min(1)
        .describe("Merchant/vendor or a short description, e.g. 'Walmart'."),
      type: z
        .enum(["income", "expense"])
        .describe("'expense' for money spent, 'income' for money received."),
      date: z
        .string()
        .optional()
        .describe("ISO date YYYY-MM-DD if the user mentioned one. Omit to default to today."),
      categoryName: z
        .enum(categoryEnumValues)
        .describe(
          "The category, exactly as given in the user's own category list above. Only use " +
            "'Uncategorized' if the user explicitly said they don't know/don't care — not as a " +
            "guess when you're simply unsure.",
        ),
    }),
    run: async ({ amount, description, type, date, categoryName }) => {
      const category = ctx.categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );
      const resolvedDate = date ?? ctx.today.toISOString().slice(0, 10);

      const { data: inserted, error } = await ctx.supabase
        .from("transactions")
        .insert({
          user_id: ctx.userId,
          date: resolvedDate,
          description,
          amount,
          type,
          category: category?.id ?? null,
          source: "ai_chat",
          // Reaching this tool call at all means the category was either
          // given directly or confirmed via a clarifying question (see the
          // description above) — never a guess, so there's nothing left to
          // flag for review.
          confirmed: true,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        return JSON.stringify({ ok: false, error: error?.message ?? "Insert failed" });
      }

      // Reflected in-memory so a later tool call within this same turn (e.g.
      // the user logs two transactions in one message) sees it too — the
      // transaction fetch in chat-actions.ts only happens once per message.
      ctx.transactions.push({
        id: inserted.id,
        date: resolvedDate,
        description,
        amount,
        type,
        category: category ? { id: category.id, name: category.name, budget_group: null } : null,
      });

      return JSON.stringify({
        ok: true,
        id: inserted.id,
        date: resolvedDate,
        description,
        amount,
        type,
        category: category?.name ?? "Uncategorized",
      });
    },
  });

  const updateTransaction = betaZodTool({
    name: "update_transaction",
    description:
      "Correct a transaction you already recorded via record_transaction — e.g. the user says " +
      "'it was yesterday' or 'actually that was $45' right after you logged something. Use " +
      "this instead of record_transaction when the user is correcting something you just " +
      "entered, not describing a brand-new purchase, so you don't create a duplicate. Finds " +
      "the transaction by its vendor/description and the date it's currently recorded under, " +
      "then updates only the field(s) you provide. Only matches transactions you recorded via " +
      "chat, not manual entries or CSV imports.",
    inputSchema: z.object({
      descriptionContains: z
        .string()
        .describe("Vendor/description substring to find it by, e.g. 'HomeSense'."),
      currentDate: z
        .string()
        .describe(
          "The ISO date (YYYY-MM-DD) it's currently recorded under — narrows the match if " +
            "there's more than one similar transaction.",
        ),
      newDate: z.string().optional().describe("New ISO date, if correcting the date."),
      newAmount: z.number().positive().optional().describe("New amount, if correcting it."),
      newCategoryName: z
        .enum(categoryEnumValues)
        .optional()
        .describe("New category, if correcting it."),
      newDescription: z.string().optional().describe("New vendor/description, if correcting it."),
    }),
    run: async ({ descriptionContains, currentDate, newDate, newAmount, newCategoryName, newDescription }) => {
      const { data: matches, error: searchError } = await ctx.supabase
        .from("transactions")
        .select("id, date, description, amount")
        .eq("user_id", ctx.userId)
        .eq("date", currentDate)
        .eq("source", "ai_chat")
        .ilike("description", `%${descriptionContains}%`);

      if (searchError) {
        return JSON.stringify({ ok: false, error: searchError.message });
      }
      if (!matches || matches.length === 0) {
        return JSON.stringify({
          ok: false,
          error:
            "No matching transaction found for that description and date — it may not have " +
            "been recorded through this chat, or the details don't match closely enough.",
        });
      }
      if (matches.length > 1) {
        return JSON.stringify({
          ok: false,
          error: "More than one matching transaction found — ask the user for more detail (exact amount) to tell them apart.",
          candidates: matches,
        });
      }

      const match = matches[0];
      const updates: Record<string, string | number | null> = {};
      if (newDate) updates.date = newDate;
      if (newAmount !== undefined) updates.amount = newAmount;
      if (newDescription) updates.description = newDescription;
      const newCategory = newCategoryName
        ? ctx.categories.find((c) => c.name.toLowerCase() === newCategoryName.toLowerCase())
        : undefined;
      // "Uncategorized" (or any name that doesn't match) intentionally
      // clears the category, same as record_transaction's fallback.
      if (newCategoryName) updates.category = newCategory?.id ?? null;

      if (Object.keys(updates).length === 0) {
        return JSON.stringify({ ok: false, error: "No changes were given." });
      }

      const { error: updateError } = await ctx.supabase
        .from("transactions")
        .update(updates)
        .eq("id", match.id);
      if (updateError) {
        return JSON.stringify({ ok: false, error: updateError.message });
      }

      // Reflect in-memory too, in case a later tool call this same turn
      // depends on the corrected value.
      const existing = ctx.transactions.find((t) => t.id === match.id);
      if (existing) {
        if (newDate) existing.date = newDate;
        if (newAmount !== undefined) existing.amount = newAmount;
        if (newDescription) existing.description = newDescription;
        if (newCategoryName) {
          existing.category = newCategory
            ? { id: newCategory.id, name: newCategory.name, budget_group: null }
            : null;
        }
      }

      return JSON.stringify({ ok: true, id: match.id, updated: updates });
    },
  });

  const deleteTransaction = betaZodTool({
    name: "delete_transaction",
    description:
      "Permanently delete a transaction. This is destructive — always tell the user which " +
      "specific transaction you found (date, amount, description) and get an explicit yes from " +
      "them in the conversation before calling this tool. Narrow the match with date and/or " +
      "amount if the description alone could match more than one transaction.",
    inputSchema: z.object({
      descriptionContains: z
        .string()
        .describe("Vendor/description substring to find it by, e.g. 'Walmart'."),
      date: z
        .string()
        .optional()
        .describe("ISO date YYYY-MM-DD, if known — narrows the match."),
      amount: z.number().positive().optional().describe("Exact amount, if known — narrows the match."),
    }),
    run: async ({ descriptionContains, date, amount }) => {
      const needle = descriptionContains.toLowerCase();
      const matches = ctx.transactions.filter((t) => {
        if (!t.description.toLowerCase().includes(needle)) return false;
        if (date && t.date !== date) return false;
        if (amount !== undefined && t.amount !== amount) return false;
        return true;
      });

      if (matches.length === 0) {
        return JSON.stringify({ ok: false, error: "No matching transaction found." });
      }
      if (matches.length > 1) {
        return JSON.stringify({
          ok: false,
          error:
            "More than one matching transaction found — ask the user for the exact date or " +
            "amount to identify the right one.",
          candidates: matches.map((m) => ({
            id: m.id,
            date: m.date,
            description: m.description,
            amount: m.amount,
          })),
        });
      }

      const match = matches[0];
      const { error } = await ctx.supabase.from("transactions").delete().eq("id", match.id);
      if (error) {
        return JSON.stringify({ ok: false, error: error.message });
      }

      const idx = ctx.transactions.findIndex((t) => t.id === match.id);
      if (idx !== -1) ctx.transactions.splice(idx, 1);

      return JSON.stringify({
        ok: true,
        deleted: {
          date: match.date,
          description: match.description,
          amount: match.amount,
          category: match.category?.name ?? "Uncategorized",
        },
      });
    },
  });

  const bulkRecategorize = betaZodTool({
    name: "bulk_recategorize",
    description:
      "Change the category for every transaction matching the given filters at once — e.g. " +
      "'make all Walmart transactions this month a Grocery expense'. At least one of " +
      "descriptionContains, currentCategoryName, or period must be given, so this can never " +
      "accidentally sweep the user's entire history. Tell the user how many transactions were " +
      "updated afterward.",
    inputSchema: z.object({
      descriptionContains: z
        .string()
        .optional()
        .describe("Vendor/description substring to match, e.g. 'Walmart'."),
      currentCategoryName: z
        .string()
        .optional()
        .describe("Only affect transactions currently in this category."),
      period: PeriodOrRangeSchema.optional().describe("Only affect transactions in this period."),
      type: z.enum(["income", "expense"]).optional(),
      newCategoryName: z
        .enum(categoryEnumValues)
        .describe("The category to assign to every matching transaction."),
    }),
    run: async ({ descriptionContains, currentCategoryName, period, type, newCategoryName }) => {
      if (!descriptionContains && !currentCategoryName && !period) {
        return JSON.stringify({
          ok: false,
          error:
            "At least one filter (description, current category, or period) is required — " +
            "refusing to recategorize the user's entire transaction history at once.",
        });
      }

      const range = period ? resolvePeriod(period, ctx.today) : null;
      const needle = descriptionContains?.toLowerCase();

      const matches = ctx.transactions.filter((t) => {
        if (range && !inRange(t, range)) return false;
        if (type && t.type !== type) return false;
        if (needle && !t.description.toLowerCase().includes(needle)) return false;
        if (
          currentCategoryName &&
          t.category?.name.toLowerCase() !== currentCategoryName.toLowerCase()
        ) {
          return false;
        }
        return true;
      });

      if (matches.length === 0) {
        return JSON.stringify({ ok: false, error: "No matching transactions found." });
      }

      const newCategory = ctx.categories.find(
        (c) => c.name.toLowerCase() === newCategoryName.toLowerCase(),
      );
      const ids = matches.map((t) => t.id);

      const { error } = await ctx.supabase
        .from("transactions")
        .update({ category: newCategory?.id ?? null, confirmed: true })
        .in("id", ids);
      if (error) {
        return JSON.stringify({ ok: false, error: error.message });
      }

      const idSet = new Set(ids);
      for (const t of ctx.transactions) {
        if (idSet.has(t.id)) {
          t.category = newCategory
            ? { id: newCategory.id, name: newCategory.name, budget_group: null }
            : null;
        }
      }

      return JSON.stringify({
        ok: true,
        updatedCount: matches.length,
        newCategory: newCategory?.name ?? "Uncategorized",
      });
    },
  });

  const getGoalPerformanceTool = betaZodTool({
    name: "get_goal_performance",
    description:
      "Get every budget goal's monthly cap vs. actual spend so far this month. Use this for " +
      "'how am I doing on my goals' style questions across all categories at once.",
    inputSchema: z.object({}),
    run: async () => {
      // getGoalPerformance expects an already month-scoped transaction list
      // (the Goals page it was lifted from scopes its own SQL query) — ctx
      // holds the full multi-month fetch window, so scope it here first.
      const thisMonth = monthKey(ctx.today);
      const monthTransactions = ctx.transactions.filter((t) => t.date.startsWith(thisMonth));
      return JSON.stringify(getGoalPerformance(monthTransactions, ctx.goals, ctx.categories));
    },
  });

  return [
    getCategorySpend,
    getBudgetSplit,
    getNetFlowTrend,
    getPaceToGoal,
    getMonthOverMonthComparison,
    getBiggestSwings,
    getCategoryDrift,
    searchTransactions,
    getGoalPerformanceTool,
    recordTransaction,
    updateTransaction,
    deleteTransaction,
    bulkRecategorize,
  ];
}
