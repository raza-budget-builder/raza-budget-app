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
        selectionMode ? "cursor-pointer hover:bg-white/5" : ""
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
          <p className="truncate font-bold text-white">{transaction.description}</p>
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
              className="font-bold text-[#fb923c] hover:text-[#fdba74] disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingDismiss(false)}
              className="text-foreground-muted hover:text-white"
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
                className="rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
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
              <button className="rounded-2xl bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200">
                Confirm
              </button>
            </form>
            <button
              onClick={() => setConfirmingDismiss(true)}
              aria-label="Dismiss transaction"
              title="Dismiss"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-foreground-muted hover:bg-white/10 hover:text-white"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
