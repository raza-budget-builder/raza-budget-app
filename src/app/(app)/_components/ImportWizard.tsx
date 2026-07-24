"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  categorizeCandidates,
  finalizeImport,
  parseCsvAndGuessMapping,
  type CategorizedCandidate,
  type MappingInput,
  type ParsedCsv,
} from "../import-actions";
import { AMOUNT_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { RecurringConfirmModal } from "./RecurringConfirmModal";
import type { PendingRecurringCandidate } from "@/lib/recurring";
import type { AccountType } from "@/lib/csv-import";

type Step = "upload" | "account-type" | "mapping" | "transfers" | "done";
type TransferDecision = "transfer" | "keep";

const FIELDS: { key: "date" | "description" | "amount"; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
];

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [mapping, setMapping] = useState<MappingInput>({
    date: "",
    description: "",
    amount: "",
    type: null,
  });
  const [categorized, setCategorized] = useState<CategorizedCandidate[] | null>(null);
  const [transferDecisions, setTransferDecisions] = useState<Map<number, TransferDecision>>(
    new Map(),
  );
  const [result, setResult] = useState<{ imported: number; needsReview: number } | null>(
    null,
  );
  const [pendingRecurringQueue, setPendingRecurringQueue] = useState<
    PendingRecurringCandidate[]
  >([]);

  const suspectedTransfers = categorized?.filter((c) => c.suspectedTransfer) ?? [];
  const allTransfersDecided = suspectedTransfers.every((c) => transferDecisions.has(c.index));

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await parseCsvAndGuessMapping(formData);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setParsed(res);
      setMapping({
        date: res.guessedMapping.date ?? "",
        description: res.guessedMapping.description ?? "",
        amount: res.guessedMapping.amount ?? "",
        type: res.guessedMapping.type ?? null,
      });
      setStep("account-type");
    });
  }

  async function commitImport(candidates: CategorizedCandidate[]) {
    if (!parsed) return;
    const res = await finalizeImport(candidates, {
      filename: parsed.filename,
      rawText: parsed.rawText,
    });
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(res);
    setStep("done");
    setPendingRecurringQueue(res.pendingRecurring);
    router.refresh();
  }

  function handleConfirmMapping() {
    if (!parsed || !accountType) return;
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setError("Please choose a column for each field.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await categorizeCandidates(parsed.rows, parsed.headers, mapping, accountType);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setCategorized(res.candidates);
      const suspected = res.candidates.filter((c) => c.suspectedTransfer);
      if (suspected.length > 0) {
        setTransferDecisions(new Map());
        setStep("transfers");
      } else {
        await commitImport(res.candidates);
      }
    });
  }

  function setTransferDecision(index: number, decision: TransferDecision) {
    setTransferDecisions((prev) => {
      const next = new Map(prev);
      next.set(index, decision);
      return next;
    });
  }

  function handleContinueAfterTransfers() {
    if (!categorized || !allTransfersDecided) return;
    setError(null);
    startTransition(async () => {
      const finalCandidates = categorized.filter(
        (c) => !c.suspectedTransfer || transferDecisions.get(c.index) === "keep",
      );
      await commitImport(finalCandidates);
    });
  }

  return (
    <>
      <div>
        {error && (
          <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
  
        {step === "upload" && (
          <div className="space-y-4">
            <form action={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted">
                  CSV file
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  required
                  className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                disabled={isPending}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
              >
                {isPending ? "Reading file…" : "Upload & continue"}
              </button>
            </form>
  
            <ol className="list-inside list-decimal space-y-1.5 border-t border-card-border pt-4 text-xs text-foreground-muted">
              <li>
                Export a CSV from your bank (usually under &quot;Statements&quot; or
                &quot;Transactions&quot;)
              </li>
              <li>Upload it here</li>
              <li>
                We&apos;ll show you what we think each column means (date, description,
                amount) — you can fix anything wrong
              </li>
              <li>Transactions get sorted into categories automatically.</li>
              <li>
                Anything we&apos;re not sure about goes into a list for you to sort
                manually
              </li>
            </ol>
          </div>
        )}
  
        {step === "account-type" && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Is this file from a debit/checking account or a credit card account? We
              use this to tell expenses, refunds, and payments apart correctly.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => {
                  setAccountType("checking");
                  setStep("mapping");
                }}
                className="rounded-2xl border border-card-border px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5"
              >
                Debit / Checking account
              </button>
              <button
                onClick={() => {
                  setAccountType("credit");
                  setStep("mapping");
                }}
                className="rounded-2xl border border-card-border px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/5"
              >
                Credit card account
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="text-sm text-foreground-muted hover:text-white"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "mapping" && parsed && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              We guessed which columns hold what — check each one and fix it if we got
              it wrong.
            </p>
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-foreground-muted">
                  We think this column is <strong>{field.label}</strong> — correct?
                </label>
                <select
                  value={mapping[field.key]}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field.key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-3 py-2 text-sm text-white"
                >
                  <option value="" disabled>
                    Select a column
                  </option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-foreground-muted">
                Does this file have an explicit transaction type column (e.g.
                &quot;Debit&quot;/&quot;Credit&quot;)? Optional — leave as None to infer
                from the amount&apos;s sign.
              </label>
              <select
                value={mapping.type ?? ""}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, type: e.target.value || null }))
                }
                className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-3 py-2 text-sm text-white"
              >
                <option value="">None — infer from amount sign</option>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-foreground-muted">
              {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmMapping}
                disabled={isPending}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
              >
                {isPending ? "Categorizing…" : "Confirm & import"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType(null);
                  setStep("upload");
                }}
                disabled={isPending}
                className="rounded-2xl border border-card-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-white"
              >
                Start over
              </button>
            </div>
          </div>
        )}
  
        {step === "transfers" && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              We flagged {suspectedTransfers.length} transaction
              {suspectedTransfers.length === 1 ? "" : "s"} that look like transfers
              between your own accounts (e-Transfers, card payments) rather than real
              income or spending. Confirm each one to exclude it from your totals, or
              dismiss the flag to import it as a normal transaction.
            </p>
  
            <ul className="divide-y divide-card-border rounded-2xl border border-card-border bg-input-bg">
              {suspectedTransfers.map((c) => {
                const decision = transferDecisions.get(c.index);
                return (
                  <li
                    key={c.index}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{c.description}</p>
                      <p className="text-foreground-muted">
                        {c.date} ·{" "}
                        <span className={AMOUNT_TEXT_CLASS[c.type]}>
                          {formatSignedAmount(c.amount, c.type)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setTransferDecision(c.index, "transfer")}
                        aria-pressed={decision === "transfer"}
                        className={`rounded-2xl px-3 py-1.5 text-sm font-medium ${
                          decision === "transfer"
                            ? "bg-white text-gray-900"
                            : "border border-card-border text-foreground-muted hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        It&apos;s a transfer
                      </button>
                      <button
                        onClick={() => setTransferDecision(c.index, "keep")}
                        aria-pressed={decision === "keep"}
                        className={`rounded-2xl px-3 py-1.5 text-sm font-medium ${
                          decision === "keep"
                            ? "bg-white text-gray-900"
                            : "border border-card-border text-foreground-muted hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        Not a transfer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
  
            <button
              onClick={handleContinueAfterTransfers}
              disabled={!allTransfersDecided || isPending}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Importing…" : "Continue"}
            </button>
            {!allTransfersDecided && (
              <p className="text-xs text-foreground-muted">
                Decide on every flagged transaction above to continue.
              </p>
            )}
          </div>
        )}
  
        {step === "done" && result && (
          <div className="space-y-3">
            <p className="text-sm text-white">
              {`Imported ${result.imported} ${
                result.imported === 1 ? "transaction" : "transactions"
              }.`}
              {result.needsReview > 0 &&
                ` ${result.needsReview} ${
                  result.needsReview === 1 ? "needs" : "need"
                } manual review — check the "Needs review" section on the Transactions page.`}
            </p>
            <a
              href="/transactions"
              className="inline-block rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
            >
              Go to Transactions
            </a>
          </div>
        )}
      </div>
      <RecurringConfirmModal
        candidate={pendingRecurringQueue[0] ?? null}
        onResolved={() => setPendingRecurringQueue((prev) => prev.slice(1))}
      />
    </>
  );
}
