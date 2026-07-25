import type { MonthlyGoalSummary } from "@/lib/goal-summary";
import { AiInsightIcon } from "./icons";

function formatMonthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function GoalsSummaryCard({ data }: { data: MonthlyGoalSummary }) {
  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card px-8 py-7">
      <div className="flex items-center gap-2">
        <AiInsightIcon className="h-4 w-auto" />
        <p className="text-xs text-foreground-muted">{formatMonthLabel(data.month)}</p>
      </div>

      {data.summary ? (
        <p className="font-editorial mt-3 text-[15px] leading-relaxed text-foreground">
          {data.summary}
        </p>
      ) : (
        <p className="mt-3 text-sm text-foreground-muted">
          Set a few budget goals from your Profile page to see a monthly summary here.
        </p>
      )}
    </section>
  );
}
