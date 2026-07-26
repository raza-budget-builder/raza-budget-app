import { AiInsightIcon } from "./icons";

// The shared "single static insight" card shell — icon + "Insight" label +
// serif-voice body text, same treatment (padding, no border, background
// tone) as the AI Insights carousel card above it. Unlike that carousel,
// this always shows exactly one insight (no rotation), so a plain static
// card rather than a client component.
export function InsightCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <AiInsightIcon className="h-4 w-auto" />
        <h2 className="font-bold text-foreground">Insight</h2>
      </div>
      <p className="font-editorial text-[15px] leading-relaxed text-foreground">{children}</p>
    </section>
  );
}
