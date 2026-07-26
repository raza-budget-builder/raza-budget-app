"use client";

import { useTransition } from "react";
import { Modal } from "./Modal";
import { confirmRecurringGroup } from "../actions";
import type { PendingRecurringCandidate } from "@/lib/recurring";
import { formatCurrency } from "@/lib/format";

const INTERVAL_LABEL: Record<PendingRecurringCandidate["interval"], string> = {
  daily: "every day",
  weekly: "weekly",
  biweekly: "every two weeks",
  monthly: "monthly",
};

export function RecurringConfirmModal({
  candidate,
  onResolved,
}: {
  candidate: PendingRecurringCandidate | null;
  onResolved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!candidate) return;
    startTransition(async () => {
      await confirmRecurringGroup(candidate.transactionIds, candidate.interval);
      onResolved();
    });
  }

  return (
    <Modal open={candidate !== null} onClose={onResolved} title="Recurring expense?">
      {candidate && (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            It looks like <span className="font-bold">{candidate.description}</span> for{" "}
            <span className="font-bold">${formatCurrency(candidate.amount)}</span> happens{" "}
            {INTERVAL_LABEL[candidate.interval]}. Want to mark it as a recurring transaction?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Yes, it's recurring"}
            </button>
            <button
              onClick={onResolved}
              disabled={isPending}
              className="flex min-h-11 items-center justify-center rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
            >
              No, just this once
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
