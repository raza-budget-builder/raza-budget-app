"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  confirmPendingTransaction,
  deleteTransaction,
  stopRecurringGroupAction,
  updateTransaction,
} from "../actions";
import { AMOUNT_TEXT_CLASS, PENDING_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { categoryColor } from "@/lib/category-color";
import { CheckIcon, PauseIcon, PencilIcon, RecurringIcon, TrashIcon } from "./icons";
import { RecurringConfirmModal } from "./RecurringConfirmModal";
import { RecurringScopeModal } from "./RecurringScopeModal";
import { RecurringToggleFields } from "./RecurringToggleFields";
import { useToast } from "./ToastProvider";
import type { PendingRecurringCandidate, RecurringInterval } from "@/lib/recurring";

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
  is_recurring?: boolean;
  recurring_group_id?: string | null;
  recurring_interval?: RecurringInterval | null;
  status?: "confirmed" | "pending";
  category: { id: string; name: string } | null;
};

export function TransactionRow({
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
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState<"income" | "expense">(transaction.type);
  const [editCategory, setEditCategory] = useState(transaction.category?.id ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingCandidate, setPendingCandidate] = useState<PendingRecurringCandidate | null>(
    null,
  );
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const { showToast } = useToast();

  const inRecurringSeries = Boolean(transaction.recurring_group_id);

  const isPendingOccurrence = transaction.status === "pending";
  const amountClass = isPendingOccurrence ? PENDING_TEXT_CLASS : AMOUNT_TEXT_CLASS[transaction.type];
  const descriptionClass = isPendingOccurrence ? PENDING_TEXT_CLASS : "text-white";

  function startEditing() {
    setEditType(transaction.type);
    setEditCategory(transaction.category?.id ?? "");
    setEditing(true);
  }

  function handleEditTypeChange(next: "income" | "expense") {
    setEditType(next);
    setEditCategory("");
  }

  function handleConfirmPending() {
    startTransition(async () => {
      await confirmPendingTransaction(transaction.id);
      showToast("Transaction confirmed");
    });
  }

  function handleStopRecurring() {
    if (!transaction.recurring_group_id) return;
    startTransition(async () => {
      await stopRecurringGroupAction(transaction.recurring_group_id!);
      setConfirmingStop(false);
    });
  }

  async function submitEdit(formData: FormData, scope?: "this" | "future") {
    const result = await updateTransaction(transaction.id, formData, scope);
    setEditing(false);
    setPendingFormData(null);
    showToast("Transaction updated");
    if (result?.pendingRecurring) setPendingCandidate(result.pendingRecurring);
  }

  function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Editing a template field (amount/category/description/interval) on a
    // transaction already in a series needs the this-vs-future choice
    // (requirement 4). A brand-new toggle-on, or an edit that doesn't touch
    // any template field, skips straight to saving.
    if (inRecurringSeries) {
      const templateChanged =
        formData.get("description") !== transaction.description ||
        Number(formData.get("amount")) !== transaction.amount ||
        (formData.get("category") || "") !== (transaction.category?.id ?? "") ||
        (formData.get("recurringInterval") || "") !== (transaction.recurring_interval ?? "");

      if (templateChanged) {
        setPendingFormData(formData);
        return;
      }
    }

    startTransition(() => {
      submitEdit(formData);
    });
  }

  if (editing && !selectionMode) {
    const filteredCategories = categories.filter((c) => c.type === editType);
    return (
      <li className="px-4 py-4">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-muted">
              Date
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={transaction.date}
              className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              defaultValue={transaction.amount}
              className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div className="col-span-2">
            <span className="block text-xs font-medium text-foreground-muted">
              Type
            </span>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-white">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={editType === "expense"}
                  onChange={() => handleEditTypeChange("expense")}
                />
                Expense
              </label>
              <label className="flex items-center gap-1.5 text-sm text-white">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={editType === "income"}
                  onChange={() => handleEditTypeChange("income")}
                />
                Income
              </label>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-foreground-muted">
              Category
            </label>
            <select
              name="category"
              required
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
            >
              <option value="" disabled>
                Select a category
              </option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-foreground-muted">
              Description
            </label>
            <input
              type="text"
              name="description"
              required
              defaultValue={transaction.description}
              className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
            />
          </div>
          {inRecurringSeries ? (
            <div className="col-span-2 rounded-2xl border border-card-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground-muted">
                    Frequency
                  </label>
                  <select
                    name="recurringInterval"
                    defaultValue={transaction.recurring_interval ?? "monthly"}
                    className="mt-1 rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {!confirmingStop ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingStop(true)}
                    className="flex items-center gap-1.5 rounded-2xl border border-card-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-[#fb923c]"
                  >
                    <PauseIcon className="h-4 w-4" />
                    Stop recurring
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground-muted">Stop series?</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleStopRecurring}
                      className="font-bold text-[#fb923c] hover:text-[#fdba74] disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingStop(false)}
                      className="text-foreground-muted hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <RecurringToggleFields />
          )}
          <div className="col-span-2 flex gap-2 pt-1">
            <button className="rounded-2xl bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-2xl border border-card-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <>
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
            <p className={`flex items-center gap-1.5 truncate font-bold ${descriptionClass}`}>
              <span
                aria-hidden="true"
                title={transaction.category?.name ?? "Uncategorized"}
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: categoryColor(transaction.category?.name, transaction.type),
                }}
              />
              <span className="truncate">{transaction.description}</span>
              {transaction.is_recurring && (
                <span title="Recurring transaction" className="inline-flex shrink-0">
                  <RecurringIcon className="h-3.5 w-3.5 text-foreground-muted" />
                  <span className="sr-only">Recurring transaction</span>
                </span>
              )}
            </p>
            <p className="text-foreground-muted">
              {transaction.date} · {transaction.category?.name ?? "Uncategorized"}
              {isPendingOccurrence && " · Pending"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`font-bold ${amountClass}`}>
            {formatSignedAmount(transaction.amount, transaction.type)}
          </span>
          {selectionMode ? null : isPendingOccurrence ? (
            <div className="flex overflow-hidden rounded-full border border-card-border">
              <button
                onClick={startEditing}
                aria-label="Edit transaction"
                title="Edit"
                className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:bg-white/10 hover:text-white"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={handleConfirmPending}
                disabled={isPending}
                aria-label="Confirm transaction"
                title="Confirm"
                className="flex h-11 w-11 items-center justify-center border-l border-card-border text-[#4ade80] hover:bg-white/10 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
            </div>
          ) : !confirmingDelete ? (
            <>
              <button
                onClick={startEditing}
                aria-label="Edit transaction"
                title="Edit"
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-foreground-muted hover:bg-white/10 hover:text-white"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete transaction"
                title="Delete"
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-foreground-muted hover:bg-white/10 hover:text-[#fb923c]"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-foreground-muted">Delete?</span>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteTransaction(transaction.id);
                    showToast("Transaction deleted");
                  })
                }
                className="font-bold text-[#fb923c] hover:text-[#fdba74] disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="text-foreground-muted hover:text-white"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </li>
      <RecurringConfirmModal
        candidate={pendingCandidate}
        onResolved={() => setPendingCandidate(null)}
      />
      <RecurringScopeModal
        open={pendingFormData !== null}
        onCancel={() => setPendingFormData(null)}
        onChoose={(scope) => {
          if (pendingFormData) submitEdit(pendingFormData, scope);
        }}
      />
    </>
  );
}
