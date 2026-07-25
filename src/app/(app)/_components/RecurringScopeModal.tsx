"use client";

import { useTransition } from "react";
import { Modal } from "./Modal";

export function RecurringScopeModal({
  open,
  onCancel,
  onChoose,
}: {
  open: boolean;
  onCancel: () => void;
  onChoose: (scope: "this" | "future") => void;
}) {
  const [isPending, startTransition] = useTransition();

  function choose(scope: "this" | "future") {
    startTransition(() => {
      onChoose(scope);
    });
  }

  return (
    <Modal open={open} onClose={onCancel} title="Update recurring series?">
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          This transaction is part of a recurring series. Should this change apply just
          to this transaction, or to this and every future occurrence?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => choose("this")}
            disabled={isPending}
            className="rounded-2xl border border-card-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            Apply to this transaction only
          </button>
          <button
            onClick={() => choose("future")}
            disabled={isPending}
            className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            Apply to this and all future transactions
          </button>
        </div>
      </div>
    </Modal>
  );
}
