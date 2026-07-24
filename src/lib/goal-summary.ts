import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { createClient } from "./supabase/server";

const anthropic = new Anthropic();

const GoalSummarySchema = z.object({
  summary: z.string(),
});

export type GoalPerformance = {
  categoryId: string;
  name: string;
  cap: number;
  spend: number;
};

export type MonthlyGoalSummary = {
  month: string; // "YYYY-MM"
  summary: string | null;
};

export async function getMonthlyGoalSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goals: GoalPerformance[],
): Promise<MonthlyGoalSummary> {
  const month = new Date().toISOString().slice(0, 7);

  if (goals.length === 0) {
    return { month, summary: null };
  }

  // Deterministic snapshot of every goal's cap+spend — a plain string
  // compare is enough to detect staleness, no need for a real hash.
  const signature = goals
    .map((g) => `${g.categoryId}:${g.cap.toFixed(2)}:${g.spend.toFixed(2)}`)
    .sort()
    .join("|");

  const { data: cached } = await supabase
    .from("monthly_goal_summaries")
    .select("summary, signature")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (cached && cached.signature === signature) {
    return { month, summary: cached.summary };
  }

  const lines = goals
    .map((g) => `${g.name}: spent $${g.spend.toFixed(2)} of a $${g.cap.toFixed(2)} monthly cap`)
    .join("\n");

  try {
    const response = await anthropic.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 512,
      output_config: {
        effort: "low",
        format: zodOutputFormat(GoalSummarySchema),
      },
      messages: [
        {
          role: "user",
          content:
            `Here's how someone is doing against their monthly budget goals so far this ` +
            `month. Write a short (2-4 sentence), warm and encouraging paragraph ` +
            `summarizing their overall goal performance — celebrate what's going well, and ` +
            `if something is over budget, mention it gently and constructively rather than ` +
            `critically. Talk to them directly as "you", kind tone throughout.\n\n` +
            `Goals:\n${lines}`,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("No parsed output from Claude");

    await supabase
      .from("monthly_goal_summaries")
      .upsert(
        { user_id: userId, month, signature, summary: parsed.summary },
        { onConflict: "user_id,month" },
      )
      .select();

    return { month, summary: parsed.summary };
  } catch (err) {
    console.error("monthly goal summary generation failed", err);
    // Fall back to a stale cached summary rather than showing nothing, if one exists.
    if (cached) return { month, summary: cached.summary };
    return { month, summary: null };
  }
}
