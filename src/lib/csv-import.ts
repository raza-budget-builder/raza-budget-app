import { z } from "zod";

export const ColumnMappingSchema = z.object({
  date: z
    .string()
    .nullable()
    .describe(
      "The exact header name of the column containing the transaction date, or null if none is confidently identifiable.",
    ),
  description: z
    .string()
    .nullable()
    .describe(
      "The exact header name of the column containing the transaction description or merchant, or null if none is confidently identifiable.",
    ),
  amount: z
    .string()
    .nullable()
    .describe(
      "The exact header name of the column containing the transaction amount, or null if none is confidently identifiable.",
    ),
  type: z
    .string()
    .nullable()
    .describe(
      "The exact header name of a column giving an explicit transaction type/direction (e.g. values like 'Debit'/'Credit' or 'DR'/'CR'), or null if the file has no such column.",
    ),
});

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export function buildCategorizationSchema(categoryNames: [string, ...string[]]) {
  return z.object({
    results: z.array(
      z.object({
        index: z.number().int(),
        category: z
          .enum(categoryNames)
          .nullable()
          .describe("One of the allowed category names, or null if unconfident."),
        confident: z
          .boolean()
          .describe(
            "True only if you're reasonably sure this category is correct. False sends the row to manual review instead of auto-assigning.",
          ),
      }),
    ),
  });
}

export function normalizeDate(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function parseAmount(raw: string): number {
  const str = String(raw ?? "").trim();
  // Accounting-style negatives: "(84.32)" -> -84.32
  const isParenNegative = /^\(.*\)$/.test(str);
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const value = Number(cleaned);
  return isParenNegative ? -Math.abs(value) : value;
}

// --- Canadian merchant lookup ------------------------------------------
//
// A small, high-confidence table so unambiguous, high-frequency Canadian
// merchants are categorized instantly without depending on the AI every
// time. Category names must match an actual category — if a user has
// renamed/deleted the target category, the row just falls through to AI
// categorization like anything else.
export const CANADIAN_MERCHANT_LOOKUP: { pattern: RegExp; categoryName: string }[] = [
  {
    pattern:
      /no frills|sobeys|\bmetro\b|loblaws|farm boy|real canadian superstore|freshco|food basics|longo'?s|save-on-foods/i,
    categoryName: "Groceries",
  },
  {
    pattern: /petro-canada|\bpetro-can\b|\besso\b|\bshell\b|\bhusky\b/i,
    categoryName: "Transportation",
  },
  { pattern: /\blcbo\b|beer store/i, categoryName: "Shopping" },
  { pattern: /\bpresto\b|\bttc\b|go transit/i, categoryName: "Transportation" },
  { pattern: /service ?ontario/i, categoryName: "Taxes" },
];

export function matchHardcodedMerchant(description: string): string | null {
  for (const entry of CANADIAN_MERCHANT_LOOKUP) {
    if (entry.pattern.test(description)) return entry.categoryName;
  }
  return null;
}

// --- Suspected-transfer detection ---------------------------------------
//
// Card-payment and Interac e-Transfer patterns — flagged, not auto-excluded.
// The user confirms or dismisses each one in the import wizard.
const TRANSFER_PATTERNS = [
  /payment from/i,
  /payment to/i,
  /payment reversal/i,
  /interac e-?transfer/i,
  /e-?transfer (sent|received|to|from)/i,
  /\betfr\b/i,
];

export function isSuspectedTransfer(description: string): boolean {
  return TRANSFER_PATTERNS.some((pattern) => pattern.test(description));
}

// --- Account-type-aware direction resolution ------------------------------
//
// Combines, in priority order: an explicit Debit/Credit-style column value
// (always wins when present), the account type selected in the import
// wizard (used only to resolve ambiguity when there's no explicit column),
// and the amount's sign. Checking accounts keep the original sign-based
// logic; credit cards default Debit-side/positive rows to expenses, and
// tell a card payment (already caught by isSuspectedTransfer) apart from a
// merchant refund among Credit-side rows.
export type AccountType = "checking" | "credit";

function normalizeExplicitDirection(raw: string | undefined): "debit" | "credit" | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (/^d(r|ebit)?$/.test(v)) return "debit";
  if (/^c(r|redit)?$/.test(v)) return "credit";
  return null;
}

export function resolveDirection(
  rawAmount: number,
  description: string,
  accountType: AccountType,
  explicitDirection: "debit" | "credit" | null,
): { placeholderType: "income" | "expense"; isRefund: boolean } {
  if (accountType === "checking") {
    if (explicitDirection === "debit") return { placeholderType: "expense", isRefund: false };
    if (explicitDirection === "credit") return { placeholderType: "income", isRefund: false };
    return { placeholderType: rawAmount < 0 ? "expense" : "income", isRefund: false };
  }

  // Credit card: Debit-side (or, with no explicit column, a positive amount
  // — many issuers post purchases as positive) defaults to an expense.
  const isCreditSide = explicitDirection ? explicitDirection === "credit" : rawAmount < 0;
  if (!isCreditSide) return { placeholderType: "expense", isRefund: false };

  // Credit-side: a payment/transfer is neither an expense nor income — the
  // existing transfer-review step handles it. Anything else on the credit
  // side is a merchant refund, which should reduce the matched category's
  // spend rather than count as new income.
  if (isSuspectedTransfer(description)) {
    return { placeholderType: "expense", isRefund: false };
  }
  return { placeholderType: "expense", isRefund: true };
}

// --- Description cleaning -------------------------------------------------
//
// Best-effort normalization for storage alongside the raw description:
// strips payment-method tags, phone numbers, and trailing Canadian
// city/province noise banks commonly append. Not exhaustive — a reasonable
// pass, not a full address parser.
const PAYMENT_TAG_PATTERN =
  /\s*\((?:apple pay|google pay|samsung pay|contactless|tap|chip|debit|credit|interac|visa|mastercard|recurring|preauthorized|pad)\)\s*/gi;
const PHONE_PATTERN = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const CANADIAN_CITIES = [
  "TORONTO", "OTTAWA", "MISSISSAUGA", "BRAMPTON", "HAMILTON", "LONDON", "MARKHAM",
  "VAUGHAN", "KITCHENER", "WINDSOR", "RICHMOND HILL", "OAKVILLE", "BURLINGTON",
  "SUDBURY", "OSHAWA", "BARRIE", "ST CATHARINES", "GUELPH", "CAMBRIDGE", "WHITBY",
  "KINGSTON", "AJAX", "THUNDER BAY", "WATERLOO", "BRANTFORD", "PICKERING",
  "NIAGARA FALLS", "VANCOUVER", "SURREY", "BURNABY", "RICHMOND", "COQUITLAM",
  "LANGLEY", "VICTORIA", "KELOWNA", "CALGARY", "EDMONTON", "MONTREAL",
  "QUEBEC CITY", "LAVAL", "GATINEAU", "WINNIPEG", "REGINA", "SASKATOON",
  "HALIFAX", "FREDERICTON", "MONCTON", "CHARLOTTETOWN", "WHITEHORSE",
  "YELLOWKNIFE",
];
const PROVINCE_CODES = ["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "PE", "NL", "YT", "NT", "NU"];
const CITY_PROVINCE_SUFFIX = new RegExp(
  `\\s+(${CANADIAN_CITIES.join("|")})(\\s+(${PROVINCE_CODES.join("|")}))?\\s*$`,
  "i",
);
const TRAILING_PROVINCE_CODE = new RegExp(`\\s+(${PROVINCE_CODES.join("|")})\\s*$`, "i");

export function cleanDescription(raw: string): string {
  let cleaned = raw;
  cleaned = cleaned.replace(PAYMENT_TAG_PATTERN, " ");
  cleaned = cleaned.replace(PHONE_PATTERN, " ");
  cleaned = cleaned.replace(CITY_PROVINCE_SUFFIX, "");
  cleaned = cleaned.replace(TRAILING_PROVINCE_CODE, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned || raw.trim();
}

// --- Row parsing ------------------------------------------------------

export type ParsedCandidate = {
  index: number;
  date: string;
  description: string;
  cleanedDescription: string;
  amount: number;
  placeholderType: "income" | "expense";
  isRefund: boolean;
  suspectedTransfer: boolean;
};

export function parseCandidateRows(
  rows: string[][],
  dateIdx: number,
  descIdx: number,
  amountIdx: number,
  accountType: AccountType,
  typeIdx: number | null,
): ParsedCandidate[] {
  return rows
    .map((r, i) => {
      const rawAmount = parseAmount(r[amountIdx]);
      const description = String(r[descIdx] ?? "").trim();
      const explicitDirection =
        typeIdx !== null ? normalizeExplicitDirection(r[typeIdx]) : null;
      // Best-effort placeholder only — real transaction type comes from the
      // assigned category, which is authoritative. This guess is used only
      // as a fallback for rows that land in "needs review" with no category
      // (isRefund, though, is always authoritative — see categorizeCandidates).
      const { placeholderType, isRefund } = resolveDirection(
        rawAmount,
        description,
        accountType,
        explicitDirection,
      );
      // Refunds are stored as a negative-amount expense so they net against
      // that category's spend instead of being counted as income.
      const amount = isRefund ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      return {
        index: i,
        date: normalizeDate(r[dateIdx]),
        description,
        cleanedDescription: cleanDescription(description),
        amount,
        placeholderType,
        isRefund,
        suspectedTransfer: isSuspectedTransfer(description),
      };
    })
    .filter((c) => c.description.length > 0 && !Number.isNaN(c.amount));
}
