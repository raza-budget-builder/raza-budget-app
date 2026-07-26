import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getPeriodRange } from "./date-ranges";
import type { createClient } from "./supabase/server";

const anthropic = new Anthropic();

const NarrativeSchema = z.object({
  summary: z.string(),
  tip: z.string(),
});

type WeekTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string } | null;
};

export type WeeklyNarrativeSummary = {
  weekStart: string;
  weekEnd: string;
  summary: string | null;
  tip: string | null;
  // Identifies this specific generated instance (changes only when the
  // summary is actually regenerated) — the client uses it to decide whether
  // the typewriter reveal has already played for this content before.
  generatedAt: string | null;
};

export async function getWeeklyNarrativeSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<WeeklyNarrativeSummary> {
  const { start, end } = getPeriodRange("this-week", new Date());

  const { data: transactions } = await supabase
    .from("transactions")
    .select("date, description, amount, type, category:categories(name)")
    .gte("date", start)
    .lte("date", end)
    // Pending recurring predictions aren't real yet — exclude from the narrative.
    .neq("status", "pending")
    .returns<WeekTransaction[]>();

  const weekTransactions = transactions ?? [];
  if (weekTransactions.length === 0) {
    return { weekStart: start, weekEnd: end, summary: null, tip: null, generatedAt: null };
  }

  const { data: cached } = await supabase
    .from("weekly_narrative_summaries")
    .select("summary, tip, transaction_count, generated_at")
    .eq("user_id", userId)
    .eq("week_start", start)
    .maybeSingle();

  if (cached && cached.transaction_count === weekTransactions.length) {
    return {
      weekStart: start,
      weekEnd: end,
      summary: cached.summary,
      tip: cached.tip,
      // Normalized to the same toISOString() shape we write on generation —
      // Postgres/Supabase round-trips a timestamptz through a different
      // string format (offset + precision) than JS's native ISO string, so
      // comparing the two verbatim would never match even for the same instant.
      generatedAt: new Date(cached.generated_at).toISOString(),
    };
  }

  const lines = weekTransactions
    .map((t) => {
      const sign = t.type === "income" ? "+" : "-";
      const category = t.category?.name ?? "Uncategorized";
      return `${t.date} — ${t.description} — ${sign}$${Math.abs(t.amount).toFixed(2)} (${category})`;
    })
    .join("\n");

  try {
    const response = await anthropic.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: zodOutputFormat(NarrativeSchema),
      },
      messages: [
        {
          role: "user",
          content:
            `Here are a person's categorized transactions from ${start} to ${end} ` +
            `(this week so far). Write two things in a warm, conversational tone — ` +
            `talk to them directly as "you", not clinical or robotic:\n\n` +
            `1. "summary": a short plain-language paragraph (2-4 sentences) about their ` +
            `spending behavior this week — what changed, what stood out.\n` +
            `2. "tip": one specific, actionable habit tip based on this data — something ` +
            `concrete they could actually do, not generic advice.\n\n` +
            `If spending in the "Tithing" or "Debt Payments" categories went up, frame that ` +
            `as something to celebrate (giving more, or paying down debt faster) — never as ` +
            `overspending or a concern, unlike other categories.\n\n` +
            `Transactions:\n${lines}`,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("No parsed output from Claude");

    // Set generated_at explicitly — upsert on a conflict does an UPDATE, and
    // the column's `default now()` only fires on INSERT, so a regenerate
    // would silently keep the old timestamp otherwise.
    const generatedAt = new Date().toISOString();

    await supabase.from("weekly_narrative_summaries").upsert(
      {
        user_id: userId,
        week_start: start,
        transaction_count: weekTransactions.length,
        summary: parsed.summary,
        tip: parsed.tip,
        generated_at: generatedAt,
      },
      { onConflict: "user_id,week_start" },
    );

    return {
      weekStart: start,
      weekEnd: end,
      summary: parsed.summary,
      tip: parsed.tip,
      generatedAt,
    };
  } catch (err) {
    console.error("weekly narrative summary generation failed", err);
    // Fall back to a stale cached summary rather than showing nothing, if one exists.
    if (cached) {
      return {
        weekStart: start,
        weekEnd: end,
        summary: cached.summary,
        tip: cached.tip,
        // Normalized to the same toISOString() shape we write on generation —
      // Postgres/Supabase round-trips a timestamptz through a different
      // string format (offset + precision) than JS's native ISO string, so
      // comparing the two verbatim would never match even for the same instant.
      generatedAt: new Date(cached.generated_at).toISOString(),
      };
    }
    return { weekStart: start, weekEnd: end, summary: null, tip: null, generatedAt: null };
  }
}
