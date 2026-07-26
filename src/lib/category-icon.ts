export type CategoryIconKey =
  | "utensils"
  | "basket"
  | "car"
  | "recurring"
  | "film"
  | "bag"
  | "home"
  | "bolt"
  | "shield"
  | "heart"
  | "plane"
  | "paw"
  | "gift"
  | "graduation"
  | "card"
  | "business"
  | "goal"
  | "receipt"
  | "handHeart";

const RULES: { pattern: RegExp; icon: CategoryIconKey }[] = [
  { pattern: /dining|restaurant|takeout|coffee/i, icon: "utensils" },
  { pattern: /grocery|groceries/i, icon: "basket" },
  { pattern: /transport|gas|fuel|parking|transit/i, icon: "car" },
  { pattern: /subscription/i, icon: "recurring" },
  { pattern: /entertainment|movie|streaming|music/i, icon: "film" },
  { pattern: /shopping|retail|clothing/i, icon: "bag" },
  { pattern: /rent|mortgage|home maintenance|housing/i, icon: "home" },
  { pattern: /utilit/i, icon: "bolt" },
  { pattern: /insurance/i, icon: "shield" },
  { pattern: /health|medical|personal care/i, icon: "heart" },
  { pattern: /travel|flight|vacation/i, icon: "plane" },
  { pattern: /pet/i, icon: "paw" },
  { pattern: /gift|donation/i, icon: "gift" },
  { pattern: /tith/i, icon: "handHeart" },
  { pattern: /childcare|education|tuition/i, icon: "graduation" },
  { pattern: /debt|loan/i, icon: "card" },
  { pattern: /business/i, icon: "business" },
  { pattern: /saving|investment/i, icon: "goal" },
  { pattern: /tax/i, icon: "receipt" },
];

// Best-effort keyword match against the category name — covers this app's
// seeded categories; anything unrecognized (a custom user category, or no
// category at all for a general/multi-category alert) falls back to a
// neutral receipt icon rather than guessing.
export function categoryIconKey(name: string | null | undefined): CategoryIconKey {
  if (!name) return "receipt";
  for (const rule of RULES) {
    if (rule.pattern.test(name)) return rule.icon;
  }
  return "receipt";
}
