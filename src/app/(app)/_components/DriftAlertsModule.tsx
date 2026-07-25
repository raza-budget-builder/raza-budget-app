import type { DriftAlerts } from "@/lib/drift-alerts";
import { categoryIconKey, type CategoryIconKey } from "@/lib/category-icon";
import {
  AiInsightIcon,
  BagIcon,
  BasketIcon,
  BoltIcon,
  BusinessIcon,
  CarIcon,
  CreditCardIcon,
  FilmIcon,
  GiftIcon,
  GoalsIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HomeIcon,
  PawIcon,
  PlaneIcon,
  ReceiptIcon,
  RecurringIcon,
  ShieldIcon,
  UtensilsIcon,
} from "./icons";

const ICONS: Record<CategoryIconKey, (props: { className?: string }) => React.ReactElement> = {
  utensils: UtensilsIcon,
  basket: BasketIcon,
  car: CarIcon,
  recurring: RecurringIcon,
  film: FilmIcon,
  bag: BagIcon,
  home: HomeIcon,
  bolt: BoltIcon,
  shield: ShieldIcon,
  heart: HeartPulseIcon,
  plane: PlaneIcon,
  paw: PawIcon,
  gift: GiftIcon,
  graduation: GraduationCapIcon,
  card: CreditCardIcon,
  business: BusinessIcon,
  goal: GoalsIcon,
  receipt: ReceiptIcon,
};

// Same green/orange pair used everywhere else for "good" vs. "needs
// attention" (transaction amounts, the 50/30/20 meters) — negative here
// means a concerning change (spending up, new subscription, price
// increase), positive means the opposite.
const POSITIVE_COLOR = "#4ade80";
const NEGATIVE_COLOR = "#fb923c";

export function DriftAlertsModule({ data }: { data: DriftAlerts }) {
  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-2">
        <AiInsightIcon className="h-6 w-auto" />
        <h2 className="font-bold text-white">Drift alerts</h2>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Categories spending notably more or less than usual, new subscriptions, and price
        increases we spotted.
      </p>
      <div className="mt-4">
        {data.alerts && data.alerts.length > 0 ? (
          <ul className="space-y-3">
            {data.alerts.map((alert, i) => {
              const Icon = ICONS[categoryIconKey(alert.category)];
              const color = alert.sentiment === "positive" ? POSITIVE_COLOR : NEGATIVE_COLOR;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}1a` }}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        alert.sentiment === "positive" ? "text-[#4ade80]" : "text-[#fb923c]"
                      }`}
                    />
                  </span>
                  <span className="pt-1 text-sm text-white">{alert.text}</span>
                </li>
              );
            })}
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
