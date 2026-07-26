"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { sendChatMessage, type ChatMessage } from "../chat-actions";
import { useChat } from "./ChatProvider";
import { CloseIcon, SendIcon } from "./icons";

// Server Actions are stateless, so the full history is resent every turn —
// trim what's sent (not what's shown) so input tokens stay bounded as a
// session grows.
const HISTORY_TURNS_SENT = 10;
// No server-side rate limiting exists yet — this is a pragmatic client-side
// stopgap, not a real abuse guard.
const MAX_SESSION_MESSAGES = 25;

// A big pool so the empty state doesn't show the same 3 prompts every time
// — a random sample is drawn once per panel open (see pickSuggestions
// below). At least a dozen are transaction-recording examples specifically,
// since that's the capability people are least likely to guess is possible
// from a budgeting chat.
const SUGGESTION_POOL = [
  // Recording a transaction
  "I spent $40.22 at Walmart on groceries",
  "I spent $12.50 on coffee at Starbucks",
  "Paid $85 for gas at Shell",
  "I spent $150 on home decor at HomeSense",
  "$60 for a haircut yesterday",
  "Spent $23.99 on a Netflix subscription",
  "I got paid $2,500 today",
  "$45 at the pharmacy for prescriptions",
  "Spent $18 on lunch at Chipotle",
  "I paid $1,200 for rent",
  "$35 for an Uber ride",
  "Spent $200 on my electric bill",
  "I spent $75 at the vet for my dog",
  "$500 freelance payment came in today",
  "Spent $30 on dog food at PetSmart",
  // Setting up a recurring transaction
  "I pay $15.99 a month for Netflix",
  "Set up my rent, $1200 due monthly",
  "I get paid $2,500 every two weeks",
  // Correcting/managing what's recorded
  "Delete that Walmart transaction from yesterday",
  "Make all my Amazon purchases this month Shopping expenses",
  "Actually that Starbucks charge was $14.50, not $12.50",
  // Spend/income totals
  "How much did I spend on dining this month?",
  "How much did I spend on subscriptions this month?",
  "What's my net income this month?",
  "How much income did I bring in this year?",
  "What's my total spending this week?",
  "How much did I spend total last week?",
  // Goals and budget
  "Am I on track with my budget goals?",
  "Am I sticking to the 50/30/20 rule?",
  "How close am I to my grocery budget?",
  "Which categories am I over budget in?",
  "How much do I have left in my dining budget this month?",
  // Trends and comparisons
  "What changed in my spending this month?",
  "How does my spending compare to last month?",
  "Compare my income this month to last month",
  "Which category is trending up the most?",
  "Is my spending unusual compared to my normal habits?",
  "What's my savings trend looking like?",
  "How much have I saved this year?",
  // Lookups
  "Show me my Uber charges from this month",
  "Show me my last 5 transactions at Amazon",
  "Show me all my transactions over $100 this month",
  "What's my biggest expense category right now?",
  "What did I spend on entertainment last month?",
];
const SUGGESTIONS_SHOWN = 3;

function pickSuggestions(): string[] {
  const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SUGGESTIONS_SHOWN);
}

export function ChatPanel() {
  const { isOpen, close } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  // Lazy initializer runs once per mount — since the panel unmounts on
  // close (see the early return below), this naturally draws a fresh random
  // set each time the chat is reopened, not on every re-render.
  const [suggestions] = useState(pickSuggestions);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isPending]);

  // Unmounting when closed resets the conversation — deliberate, matching
  // Modal.tsx's convention, since chat history isn't persisted server-side.
  if (!isOpen) return null;

  const sessionLimitReached = messages.length >= MAX_SESSION_MESSAGES;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isPending || sessionLimitReached) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    const historyToSend = messages.slice(-HISTORY_TURNS_SENT * 2);
    startTransition(async () => {
      const res = await sendChatMessage(historyToSend, trimmed);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: res.reply }]);
    });
  }

  function askSuggestion(text: string) {
    setInput(text);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask your budget"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-card sm:h-[min(700px,85vh)] sm:max-w-md sm:rounded-xl sm:border sm:border-card-border"
      >
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <h2 className="text-sm font-bold text-foreground">Ask your budget</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-foreground/10 hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-3">
              <p className="text-center text-sm text-foreground-muted">
                Ask a question about your spending or income.
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => askSuggestion(s)}
                    className="min-h-11 rounded-xl border border-card-border px-4 py-2.5 text-left text-sm text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {messages.map((m, i) => (
                <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "border border-card-border text-foreground"
                    }`}
                  >
                    {m.content}
                  </p>
                </li>
              ))}
              {isPending && (
                <li className="flex justify-start">
                  <p className="max-w-[85%] rounded-xl border border-card-border px-4 py-2.5 text-sm text-foreground-muted">
                    Thinking…
                  </p>
                </li>
              )}
            </ul>
          )}
          {error && <p className="mt-3 text-sm text-attention">{error}</p>}
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t border-card-border p-4">
          {sessionLimitReached ? (
            <p className="text-center text-sm text-foreground-muted">
              You&apos;ve reached this conversation&apos;s limit — close and reopen to start a
              new one.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your spending…"
                disabled={isPending}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-card-border bg-input-bg px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
