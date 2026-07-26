import { z } from "zod";

// Deliberately scoped to digital screenshots only (email receipts, payment
// apps, bank/card statements, spreadsheets) — not photos of physical paper
// receipts, which have their own OCR reliability problems (glare, angle,
// crumpled text) this app doesn't try to solve yet. Claude makes this call
// itself from the image rather than the app trying to detect it client-side,
// since "is this a screenshot or a photo" isn't reliably determinable from
// file metadata alone.
export const ScreenshotExtractionSchema = z.object({
  isScreenshot: z
    .boolean()
    .describe(
      "True if this image is a screenshot of digital transaction data — an email " +
        "receipt, a payment app's transaction list (e.g. Apple Wallet, Google Pay), a " +
        "bank/credit card app or website, or a spreadsheet. False if it looks like a " +
        "photo of a physical printed receipt or paper document taken with a camera " +
        "(visible paper texture, glare, shadows, an angled or hand-held perspective) — " +
        "those aren't supported yet.",
    ),
  rejectionReason: z
    .string()
    .describe(
      "If isScreenshot is false, one short sentence explaining why (e.g. 'This looks " +
        "like a photo of a printed receipt.'). Empty string if isScreenshot is true.",
    ),
  sourceLabel: z
    .string()
    .describe(
      "A short label for what kind of screenshot this is, e.g. 'Apple Wallet " +
        "transaction list', 'Email receipt', 'Bank statement', 'Spreadsheet'. Empty " +
        "string if isScreenshot is false.",
    ),
  transactions: z
    .array(
      z.object({
        date: z
          .string()
          .nullable()
          .describe("ISO date (YYYY-MM-DD) if visible in the image, otherwise null."),
        description: z.string().describe("The merchant name or transaction description."),
        amount: z.number().describe("The transaction amount as a positive number."),
        type: z
          .enum(["income", "expense"])
          .describe("Whether this is money in (income) or money out (expense)."),
      }),
    )
    .describe(
      "Every transaction confidently readable in the image. Leave empty if isScreenshot " +
        "is false, or if the image is a screenshot but no transaction data is legible — " +
        "never invent a transaction that isn't actually shown.",
    ),
});

export type ScreenshotExtraction = z.infer<typeof ScreenshotExtractionSchema>;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

// Comfortably under Anthropic's per-image request limits once base64
// overhead (~33%) is factored in — screenshots are almost always well under
// this; a huge multi-page PDF-exported-as-PNG bank statement is the
// realistic edge case this guards against.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
