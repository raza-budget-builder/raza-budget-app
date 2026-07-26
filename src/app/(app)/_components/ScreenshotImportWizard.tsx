"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  finalizeImport,
  parseScreenshotAndCategorize,
  type CategorizedCandidate,
} from "../import-actions";
import { AMOUNT_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { RecurringConfirmModal } from "./RecurringConfirmModal";
import type { PendingRecurringCandidate } from "@/lib/recurring";

type Step = "upload" | "transfers" | "done";
type TransferDecision = "transfer" | "keep";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function ScreenshotImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sourceLabel, setSourceLabel] = useState("");
  const [rawTransactionsJson, setRawTransactionsJson] = useState("");
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

  async function commitImport(candidates: CategorizedCandidate[]) {
    const res = await finalizeImport(
      candidates,
      { filename: `${sourceLabel} screenshot`, rawText: rawTransactionsJson },
      "screenshot",
    );
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(res);
    setStep("done");
    setPendingRecurringQueue(res.pendingRecurring);
    router.refresh();
  }

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await parseScreenshotAndCategorize(formData);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSourceLabel(res.sourceLabel);
      setRawTransactionsJson(res.rawTransactionsJson);
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
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <form action={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted">
                  Screenshot
                </label>
                <input
                  type="file"
                  name="file"
                  accept={ACCEPT}
                  required
                  className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
                />
              </div>
              <button
                disabled={isPending}
                className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
              >
                {isPending ? "Reading screenshot…" : "Upload & continue"}
              </button>
            </form>

            <ol className="list-inside list-decimal space-y-1.5 border-t border-card-border pt-4 text-xs text-foreground-muted">
              <li>
                Take a screenshot of an email receipt, a payment app&apos;s transaction list
                (like Apple Wallet), a bank or credit card statement, or a spreadsheet
              </li>
              <li>Upload it here — not a photo of a printed receipt, that&apos;s not supported yet</li>
              <li>
                We&apos;ll read what&apos;s in it and sort transactions into categories
                automatically
              </li>
              <li>
                Anything we&apos;re not sure about goes into a list for you to sort manually
              </li>
            </ol>
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

            <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-input-bg">
              {suspectedTransfers.map((c) => {
                const decision = transferDecisions.get(c.index);
                return (
                  <li
                    key={c.index}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{c.description}</p>
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
                        className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium ${
                          decision === "transfer"
                            ? "bg-accent text-accent-foreground"
                            : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                        }`}
                      >
                        It&apos;s a transfer
                      </button>
                      <button
                        onClick={() => setTransferDecision(c.index, "keep")}
                        aria-pressed={decision === "keep"}
                        className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium ${
                          decision === "keep"
                            ? "bg-accent text-accent-foreground"
                            : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
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
              className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="text-sm text-foreground">
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
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
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
