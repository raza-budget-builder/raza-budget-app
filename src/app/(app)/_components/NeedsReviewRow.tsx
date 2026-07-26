"use client";

import { useState, useTransition } from "react";
import { confirmCategory, deleteTransaction } from "../actions";
import { AMOUNT_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { TrashIcon } from "./icons";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
};

export function NeedsReviewRow({
  transaction,
  categories,
  selectionMode = false,
  selected = false,
  onToggleSelected,
}: {
  transaction: Transaction;
  categories: Category[];
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <li
      onClick={selectionMode ? onToggleSelected : undefined}
      className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
        selectionMode ? "cursor-pointer hover:bg-foreground/5" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${transaction.description}`}
            className="h-4 w-4 shrink-0 rounded border-card-border"
          />
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{transaction.description}</p>
          <p className="text-foreground-muted">{transaction.date}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-bold ${AMOUNT_TEXT_CLASS[transaction.type]}`}>
          {formatSignedAmount(transaction.amount, transaction.type)}
        </span>

        {selectionMode ? null : confirmingDismiss ? (
          <>
            <span className="text-foreground-muted">Dismiss?</span>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteTransaction(transaction.id);
                })
              }
              className="-my-2 -mx-1 px-1 py-2 font-bold text-attention hover:text-attention-hover disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingDismiss(false)}
              className="-my-2 -mx-1 px-1 py-2 text-foreground-muted hover:text-foreground"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <form
              action={async (formData) => {
                await confirmCategory(transaction.id, formData);
              }}
              className="flex items-center gap-2"
            >
              <select
                name="category"
                required
                defaultValue=""
                className="min-h-11 rounded-xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
                Confirm
              </button>
            </form>
            <button
              onClick={() => setConfirmingDismiss(true)}
              aria-label="Dismiss transaction"
              title="Dismiss"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-foreground/10 hover:text-foreground"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
