import type { DriftAlerts } from "@/lib/drift-alerts";
import { AiInsightIcon } from "./icons";
import { CategoryIconBadge } from "./CategoryIconBadge";

export function DriftAlertsModule({ data }: { data: DriftAlerts }) {
  return (
    <section className="mb-4 rounded-xl bg-card p-5">
      <div className="flex items-center gap-2">
        <AiInsightIcon className="h-4 w-auto" />
        <h2 className="font-bold text-foreground">Drift alerts</h2>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Categories spending notably more or less than usual, new subscriptions, and price
        increases we spotted.
      </p>
      <div className="mt-4">
        {data.alerts && data.alerts.length > 0 ? (
          <ul className="space-y-3">
            {data.alerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-3">
                <CategoryIconBadge
                  categoryName={alert.category}
                  tone={alert.sentiment === "positive" ? "positive" : "attention"}
                />
                <span className="pt-1 text-sm text-foreground">{alert.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">
            Nothing unusual to flag yet — keep tracking and we&apos;ll catch anything that
            drifts.
          </p>
        )}
      </div>
    </section>
  );
}
