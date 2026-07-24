"use server";

import Papa from "papaparse";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ColumnMappingSchema,
  buildCategorizationSchema,
  matchHardcodedMerchant,
  parseCandidateRows,
  type AccountType,
} from "@/lib/csv-import";
import { detectRecurringTransactions, type PendingRecurringCandidate } from "@/lib/recurring";

const anthropic = new Anthropic();

const MAX_ROWS = 500;
const CATEGORIZE_CHUNK_SIZE = 40;

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  guessedMapping: {
    date: string | null;
    description: string | null;
    amount: string | null;
    type: string | null;
  };
  filename: string;
  rawText: string;
};

export type MappingInput = {
  date: string;
  description: string;
  amount: string;
  type: string | null;
};

export type CategorizedCandidate = {
  index: number;
  date: string;
  description: string;
  cleanedDescription: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  categoryName: string | null;
  confident: boolean;
  suspectedTransfer: boolean;
  isRefund: boolean;
};

export async function parseCsvAndGuessMapping(
  formData: FormData,
): Promise<ParsedCsv | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file." };
  }

  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const [headerRow, ...dataRows] = result.data;
  if (!headerRow || headerRow.length === 0 || dataRows.length === 0) {
    return { error: "The CSV needs a header row and at least one data row." };
  }
  if (dataRows.length > MAX_ROWS) {
    return {
      error: `This file has ${dataRows.length} rows — please split it into batches of ${MAX_ROWS} or fewer.`,
    };
  }

  const sample = dataRows.slice(0, 5);

  const response = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    output_config: {
      effort: "low",
      format: zodOutputFormat(ColumnMappingSchema),
    },
    messages: [
      {
        role: "user",
        content:
          `Here is a CSV's header row and a sample of its data rows. Identify which ` +
          `column contains the transaction date, which contains the description or ` +
          `merchant, and which contains the amount. Also check whether there is a ` +
          `separate column giving an explicit transaction type or direction (e.g. ` +
          `values like "Debit"/"Credit" or "DR"/"CR") — identify it if so, otherwise ` +
          `leave it null.\n\n` +
          `Headers: ${JSON.stringify(headerRow)}\n\n` +
          `Sample rows:\n${sample.map((r) => JSON.stringify(r)).join("\n")}`,
      },
    ],
  });

  const guessedMapping = response.parsed_output ?? {
    date: null,
    description: null,
    amount: null,
    type: null,
  };

  return {
    headers: headerRow,
    rows: dataRows,
    guessedMapping,
    filename: file.name,
    rawText: text,
  };
}

// Parses rows, applies the hardcoded Canadian-merchant lookup, and runs AI
// categorization (with Canadian retail context) for whatever's left. Stops
// short of inserting anything — the import wizard reviews suspected
// transfers against this result set before anything is committed.
export async function categorizeCandidates(
  rows: string[][],
  headers: string[],
  mapping: MappingInput,
  accountType: AccountType,
): Promise<{ candidates: CategorizedCandidate[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dateIdx = headers.indexOf(mapping.date);
  const descIdx = headers.indexOf(mapping.description);
  const amountIdx = headers.indexOf(mapping.amount);
  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return { error: "Column mapping is invalid." };
  }
  const typeIdx = mapping.type ? headers.indexOf(mapping.type) : -1;

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, type");
  if (categoriesError) return { error: categoriesError.message };
  if (!categories || categories.length === 0) {
    return { error: "No categories found for this account." };
  }
  const categoryNames = categories.map((c) => c.name) as [string, ...string[]];
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const candidates = parseCandidateRows(
    rows,
    dateIdx,
    descIdx,
    amountIdx,
    accountType,
    typeIdx === -1 ? null : typeIdx,
  );
  if (candidates.length === 0) {
    return { error: "No valid rows found with the selected columns." };
  }

  type Resolved = {
    categoryId: string | null;
    categoryName: string | null;
    type: "income" | "expense";
    confident: boolean;
  };
  const resultByIndex = new Map<number, Resolved>();
  const needsAi: typeof candidates = [];

  // Hardcoded, unambiguous Canadian merchants skip the AI call entirely.
  for (const c of candidates) {
    const hardcodedName = matchHardcodedMerchant(c.description);
    const hardcodedCategory = hardcodedName ? categoryByName.get(hardcodedName) : undefined;
    if (hardcodedCategory) {
      resultByIndex.set(c.index, {
        categoryId: hardcodedCategory.id,
        categoryName: hardcodedCategory.name,
        type: hardcodedCategory.type,
        confident: true,
      });
    } else {
      needsAi.push(c);
    }
  }

  if (needsAi.length > 0) {
    const categorizationSchema = buildCategorizationSchema(categoryNames);
    const needsAiByIndex = new Map(needsAi.map((c) => [c.index, c]));

    for (let i = 0; i < needsAi.length; i += CATEGORIZE_CHUNK_SIZE) {
      const chunk = needsAi.slice(i, i + CATEGORIZE_CHUNK_SIZE);
      const response = await anthropic.messages.parse({
        model: "claude-opus-4-8",
        max_tokens: 4096,
        output_config: {
          effort: "low",
          format: zodOutputFormat(categorizationSchema),
        },
        messages: [
          {
            role: "user",
            content:
              `Many of these transactions are from Canadian merchants — use Canadian ` +
              `retail and business context when a name is ambiguous. For example: ` +
              `grocery chains like No Frills, Sobeys, Metro, Loblaws, and Farm Boy are ` +
              `groceries; gas stations like Petro-Canada and Esso are transportation; ` +
              `LCBO or Beer Store purchases are alcohol (treat as shopping); Presto, ` +
              `TTC, and GO Transit are transit (transportation); Service Ontario ` +
              `charges are government fees.\n\n` +
              `Assign the best-fitting category to each transaction below, using ONLY ` +
              `the allowed category names. If you are not reasonably confident about a ` +
              `transaction, set confident to false and category to null — it goes to a ` +
              `manual review list instead of being auto-assigned.\n\n` +
              `Allowed categories: ${categoryNames.join(", ")}\n\n` +
              `Transactions (index. description — amount):\n` +
              chunk
                .map((c) => `${c.index}. ${c.description} — $${c.amount.toFixed(2)}`)
                .join("\n"),
          },
        ],
      });

      for (const r of response.parsed_output?.results ?? []) {
        const matchedCategory = r.category ? categoryByName.get(r.category) : undefined;
        const original = needsAiByIndex.get(r.index);
        const isConfident = Boolean(r.confident && matchedCategory);
        resultByIndex.set(r.index, {
          categoryId: isConfident ? matchedCategory!.id : null,
          categoryName: isConfident ? matchedCategory!.name : null,
          type: isConfident ? matchedCategory!.type : (original?.placeholderType ?? "expense"),
          confident: isConfident,
        });
      }
    }
  }

  const result: CategorizedCandidate[] = candidates.map((c) => {
    const resolved = resultByIndex.get(c.index);
    return {
      index: c.index,
      date: c.date,
      description: c.description,
      cleanedDescription: c.cleanedDescription,
      amount: c.amount,
      // A refund is always an expense-side adjustment, regardless of what
      // category matched — it must never be recorded as income.
      type: c.isRefund ? "expense" : (resolved?.type ?? c.placeholderType),
      categoryId: resolved?.categoryId ?? null,
      categoryName: resolved?.categoryName ?? null,
      confident: resolved?.confident ?? false,
      suspectedTransfer: c.suspectedTransfer,
      isRefund: c.isRefund,
    };
  });

  return { candidates: result };
}

// Commits an already-categorized, already-decided candidate list — the
// import wizard calls this after the suspected-transfer review (if any),
// having already dropped the rows confirmed as transfers. Also records the
// batch itself (original filename + raw CSV text) so the Profile page's
// Imports section can offer it back for download or revert it wholesale.
export async function finalizeImport(
  candidates: CategorizedCandidate[],
  csvMeta: { filename: string; rawText: string },
): Promise<
  | { imported: number; needsReview: number; pendingRecurring: PendingRecurringCandidate[] }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (candidates.length === 0) {
    return { imported: 0, needsReview: 0, pendingRecurring: [] };
  }

  const { data: importRow, error: importError } = await supabase
    .from("csv_imports")
    .insert({
      user_id: user.id,
      filename: csvMeta.filename,
      raw_content: csvMeta.rawText,
      row_count: candidates.length,
    })
    .select("id")
    .single();
  if (importError || !importRow) {
    return { error: importError?.message ?? "Failed to record the import." };
  }

  const toInsert = candidates.map((c) => ({
    user_id: user.id,
    date: c.date,
    description: c.description,
    cleaned_description: c.cleanedDescription,
    amount: c.amount,
    type: c.type,
    category: c.categoryId,
    source: "csv" as const,
    confirmed: c.confident,
    import_id: importRow.id,
  }));

  const { data: insertedRows, error: insertError } = await supabase
    .from("transactions")
    .insert(toInsert)
    .select("id");
  if (insertError) return { error: insertError.message };

  const pendingRecurring =
    insertedRows && insertedRows.length > 0
      ? await detectRecurringTransactions(
          supabase,
          user.id,
          insertedRows.map((r) => r.id),
        )
      : [];

  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return {
    imported: toInsert.length,
    needsReview: toInsert.filter((t) => !t.confirmed).length,
    pendingRecurring,
  };
}

// Undo an entire import batch: deletes every transaction it created (past
// confirmed ones included — this is a deliberate, explicit user action, not
// the passive "stop recurring" semantics elsewhere in the app) and marks the
// batch reverted. The csv_imports row itself is kept so the file is still
// downloadable and the batch stays visible in history.
export async function revertCsvImport(importId: string): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("import_id", importId)
    .eq("user_id", user.id);
  if (deleteError) return { error: deleteError.message };

  const { error: updateError } = await supabase
    .from("csv_imports")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", importId)
    .eq("user_id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/profile");
}

export type CsvImportSummary = {
  id: string;
  filename: string;
  rowCount: number;
  importedAt: string;
  revertedAt: string | null;
};

export async function listCsvImports(): Promise<CsvImportSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("csv_imports")
    .select("id, filename, row_count, imported_at, reverted_at")
    .eq("user_id", user.id)
    .order("imported_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    rowCount: row.row_count,
    importedAt: row.imported_at,
    revertedAt: row.reverted_at,
  }));
}

// Fetched on demand (not as part of the list query) — raw CSV text can be
// sizable and there's no reason to load every past import's full contents
// just to render the list.
export async function downloadCsvImport(
  importId: string,
): Promise<{ filename: string; rawText: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("csv_imports")
    .select("filename, raw_content")
    .eq("id", importId)
    .eq("user_id", user.id)
    .single();
  if (error || !data) return { error: error?.message ?? "Import not found." };

  return { filename: data.filename, rawText: data.raw_content };
}
