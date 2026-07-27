"use client";

import { useTransition } from "react";
import { Modal } from "./Modal";
import { formatCurrency } from "@/lib/format";
import type { DuplicateCandidate } from "@/lib/duplicate-detection";

export function DuplicateConfirmModal({
  candidate,
  onConfirm,
  onCancel,
}: {
  candidate: DuplicateCandidate | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(() => {
      onConfirm();
    });
  }

  return (
    <Modal open={candidate !== null} onClose={onCancel} title="Possible duplicate">
      {candidate && (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            This looks like it might already be recorded:{" "}
            <span className="font-bold">{candidate.description}</span> for{" "}
            <span className="font-bold">${formatCurrency(candidate.amount)}</span> on{" "}
            {candidate.date}
            {candidate.categoryName && (
              <>
                {" "}
                in <span className="font-bold">{candidate.categoryName}</span>
              </>
            )}
            . Add it anyway?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add anyway"}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex min-h-11 items-center justify-center rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
