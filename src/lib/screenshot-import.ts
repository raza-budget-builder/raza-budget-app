import { z } from "zod";

// Accepts both digital screenshots (email receipts, payment apps, bank/card
// statements, spreadsheets) and photos of physical printed receipts —
// image-token cost is driven by pixel dimensions, not content, so a photo
// costs about the same to process as a screenshot. Photos are just more
// prone to misreads (glare, angle, faded thermal print), which is why
// low-confidence rows fall through to manual review same as everything else.
export const ScreenshotExtractionSchema = z.object({
  isReadable: z
    .boolean()
    .describe(
      "True if this image shows transaction/receipt data legible enough to extract — a " +
        "printed receipt (photographed), an email receipt, a payment app's transaction " +
        "list (e.g. Apple Wallet, Google Pay), a bank/credit card app or website, or a " +
        "spreadsheet. False if the image doesn't contain recognizable transaction data " +
        "at all, or it's too blurry/unclear to read reliably.",
    ),
  rejectionReason: z
    .string()
    .describe(
      "If isReadable is false, one short sentence explaining why (e.g. 'This image " +
        "doesn't appear to contain any transaction or receipt data.'). Empty string if " +
        "isReadable is true.",
    ),
  sourceLabel: z
    .string()
    .describe(
      "A short label for what kind of image this is, e.g. 'Printed receipt (photo)', " +
        "'Apple Wallet transaction list', 'Email receipt', 'Bank statement', " +
        "'Spreadsheet'. Empty string if isReadable is false.",
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
      "Every transaction confidently readable in the image. Leave empty if isReadable is " +
        "false, or if the image is readable but no transaction data is legible — never " +
        "invent a transaction that isn't actually shown.",
    ),
});

export type ScreenshotExtraction = z.infer<typeof ScreenshotExtractionSchema>;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

// Comfortably under Anthropic's per-image request limits once base64
// overhead (~33%) is factored in — screenshots and receipt photos are
// almost always well under this; a huge multi-page PDF-exported-as-PNG
// bank statement is the realistic edge case this guards against.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
