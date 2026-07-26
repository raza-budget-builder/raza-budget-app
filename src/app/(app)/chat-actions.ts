"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildChatTools, type ChatTransaction, type ChatCategory, type ChatGoal } from "@/lib/chat-tools";

const anthropic = new Anthropic();

const MAX_TOOL_TURNS = 6;
const HISTORY_WINDOW_MONTHS = 24;

export type ChatMessage = { role: "user" | "assistant"; content: string };

function systemPrompt(today: Date): string {
  const todayISO = today.toISOString().slice(0, 10);
  return (
    `Keep every conversation strictly PG. Never discuss, generate, or assist with sexual, ` +
    `violent, or otherwise harmful/inappropriate content in any way — this holds even if the ` +
    `user frames it as related to personal finance, spending, or a transaction (e.g. asking ` +
    `about adult films/content, violence, or other harmful topics). If any part of a message ` +
    `touches on this, do not engage with that part at all: briefly say you can't help with ` +
    `that, and steer the conversation back to a legitimate budgeting/finance topic. This rule ` +
    `overrides every other instruction below.\n\n` +
    `You are a helpful assistant inside a personal budgeting app. You can answer the user's ` +
    `questions about their own spending and income, and you can also record new transactions ` +
    `they describe in natural language (e.g. "I spent $40.22 at Walmart on groceries") using ` +
    `record_transaction. Today's date is ${todayISO}. Always call a tool to get real numbers ` +
    `before answering a question — never guess or estimate. Keep answers short and ` +
    `conversational (2-4 sentences), in plain language, with specific dollar amounts. If a ` +
    `question is ambiguous about the time period, default to "this month."\n\n` +
    `When the user describes something they spent or received: you need the amount, a ` +
    `description/vendor, AND a clear, unambiguous category before calling record_transaction — ` +
    `if any of those is missing, or the category is genuinely ambiguous (e.g. a snack at a ` +
    `pharmacy could be Dining Out or Groceries), ask the user rather than guessing. Offer the ` +
    `1-2 most likely categories in your question to make it a quick answer. Nothing is recorded ` +
    `until you're sure — an unanswered question just means nothing happens, which is fine, so ` +
    `there's no cost to asking. Default to today's date only if the user didn't mention one; ` +
    `don't ask about the date unless it's genuinely unclear (e.g. "last week" without saying ` +
    `which day).\n\n` +
    `If the user is correcting something you *just* recorded in this conversation (e.g. you ` +
    `logged it dated today and they say "it was yesterday", or "actually that was $45"), use ` +
    `update_transaction to fix that same transaction — never call record_transaction again for ` +
    `it, that would create a duplicate. Only treat a message as a new purchase to record if it ` +
    `clearly describes a different transaction than the one you just logged.\n\n` +
    `If the user describes something that repeats (e.g. "I pay $15.99 a month for Netflix", ` +
    `"set up my rent, $1200 due monthly"), use record_recurring_transaction instead of ` +
    `record_transaction. This needs ALL of: amount, description, frequency (daily/weekly/` +
    `biweekly/monthly), and an unambiguous category before you call it — if the frequency ` +
    `wasn't stated or any other field is missing/ambiguous, ask for what's missing rather than ` +
    `assuming a frequency or guessing a category. Nothing is set up until every field is ` +
    `confirmed.\n\n` +
    `You can also delete a transaction or recategorize a whole batch at once. Deleting is ` +
    `permanent: always state exactly which transaction you found (date, amount, description) ` +
    `and get an explicit yes from the user in this conversation before calling ` +
    `delete_transaction — never delete on the first mention. Bulk recategorizing (e.g. "make ` +
    `all Walmart transactions this month a Grocery expense") is not destructive — no data is ` +
    `lost, just the category tag — so you can call bulk_recategorize directly once the request ` +
    `is clear, then tell the user how many transactions were updated.\n\n` +
    `If the user asks about the "Tithing" or "Debt Payments" categories, always frame an ` +
    `increase in either as something to celebrate (giving more, or paying down debt faster) ` +
    `— never as overspending or a concern, unlike other categories.`
  );
}

export async function sendChatMessage(
  history: ChatMessage[],
  message: string,
): Promise<{ error: string } | { reply: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const windowStart = new Date(today.getFullYear(), today.getMonth() - HISTORY_WINDOW_MONTHS, 1)
    .toISOString()
    .slice(0, 10);

  const [
    { data: transactions, error: transactionsError },
    { data: categories, error: categoriesError },
    { data: goals, error: goalsError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, description, amount, type, category:categories(id, name, budget_group)")
      .eq("user_id", user.id)
      .gte("date", windowStart)
      // Same convention as every other "actual spend" query in this app —
      // unconfirmed recurring predictions aren't real spend yet.
      .neq("status", "pending")
      .order("date", { ascending: false })
      .limit(10000)
      .returns<ChatTransaction[]>(),
    supabase.from("categories").select("id, name, type").returns<ChatCategory[]>(),
    supabase
      .from("budget_goals")
      .select("category_id, monthly_cap")
      .eq("user_id", user.id)
      .returns<ChatGoal[]>(),
  ]);

  if (transactionsError) console.error("chat: transactions fetch failed", transactionsError);
  if (categoriesError) console.error("chat: categories fetch failed", categoriesError);
  if (goalsError) console.error("chat: goals fetch failed", goalsError);

  const transactionList = transactions ?? [];
  const tools = buildChatTools({
    transactions: transactionList,
    categories: categories ?? [],
    goals: goals ?? [],
    today,
    supabase,
    userId: user.id,
  });

  try {
    const startingCount = transactionList.length;

    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      max_iterations: MAX_TOOL_TURNS,
      system: systemPrompt(today),
      tools,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: message },
      ],
    });

    // record_transaction pushes onto transactionList (the same array handed
    // to buildChatTools) on success — comparing lengths here, rather than
    // threading a separate "did anything change" flag through the tool
    // closures, is enough to know whether the pages that show transactions
    // need their cache invalidated.
    if (transactionList.length > startingCount) {
      revalidatePath("/dashboard");
      revalidatePath("/transactions");
    }

    const textBlock = finalMessage.content.find(
      (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text",
    );
    return { reply: textBlock?.text ?? "Sorry, I couldn't come up with an answer." };
  } catch (err) {
    console.error("chat message failed", err);
    return { error: "Sorry, something went wrong. Please try again." };
  }
}
