import { categoryIconKey, type CategoryIconKey } from "@/lib/category-icon";
import {
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
  HandHeartIcon,
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
  handHeart: HandHeartIcon,
};

// Same green/orange pair used everywhere else for "good" vs. "needs
// attention" (transaction amounts, the 50/30/20 meters, Drift Alerts).
const TONE_COLOR = {
  positive: "var(--positive)",
  attention: "var(--attention)",
} as const;

// A colored circle with the category's icon inside, tinted by sentiment —
// shared by Drift Alerts and the Budget Forecast card so the icon map and
// badge markup live in one place instead of being copy-pasted per module.
export function CategoryIconBadge({
  categoryName,
  tone,
}: {
  categoryName: string | null;
  tone: "positive" | "attention";
}) {
  const Icon = ICONS[categoryIconKey(categoryName)];
  const color = TONE_COLOR[tone];
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <Icon className={`h-4 w-4 ${tone === "positive" ? "text-positive" : "text-attention"}`} />
    </span>
  );
}
