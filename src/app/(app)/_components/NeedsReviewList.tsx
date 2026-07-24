"use client";

import { useState, useTransition } from "react";
import { NeedsReviewRow } from "./NeedsReviewRow";
import { bulkConfirmCategory, deleteTransactions } from "../actions";

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

export function NeedsReviewList({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [isPending, startTransition] = useTransition();

  if (transactions.length === 0) return null;

  function resetSelection() {
    setSelecting(false);
    setSelectedIds(new Set());
    setConfirmingDismiss(false);
    setBulkCategory("");
  }

  function toggleSelecting() {
    if (selecting) resetSelection();
    else setSelecting(true);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isAllSelected = selectedIds.size === transactions.length;

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? new Set() : new Set(transactions.map((t) => t.id)));
  }

  function handleDismissSelected() {
    startTransition(async () => {
      await deleteTransactions([...selectedIds]);
      resetSelection();
    });
  }

  function handleApplyBulkCategory() {
    if (!bulkCategory) return;
    startTransition(async () => {
      await bulkConfirmCategory([...selectedIds], bulkCategory);
      resetSelection();
    });
  }

  return (
    <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-amber-300">
          Needs review ({transactions.length})
        </h2>
        <button
          onClick={toggleSelecting}
          className="text-sm text-foreground-muted hover:text-white"
        >
          {selecting ? "Cancel" : "Select"}
        </button>
      </div>

      {selecting && (
        <div className="mb-3 space-y-3 rounded-2xl border border-card-border bg-card px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-foreground-muted">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selectedIds.size > 0 && !isAllSelected;
                }}
                onChange={toggleSelectAll}
                aria-label="Select all"
                className="h-4 w-4 rounded border-card-border"
              />
              {selectedIds.size} selected
            </label>
            {!confirmingDismiss ? (
              <button
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmingDismiss(true)}
                className="font-bold text-[#fb923c] hover:text-[#fdba74] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Dismiss selected
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-foreground-muted">
                  Dismiss {selectedIds.size} transaction
                  {selectedIds.size === 1 ? "" : "s"}?
                </span>
                <button
                  disabled={isPending}
                  onClick={handleDismissSelected}
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
              </div>
            )}
          </div>

          {!confirmingDismiss && (
            <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
              >
                <option value="">Set category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                disabled={selectedIds.size === 0 || !bulkCategory || isPending}
                onClick={handleApplyBulkCategory}
                className="rounded-2xl bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply to selected
              </button>
            </div>
          )}
        </div>
      )}

      <ul className="divide-y divide-amber-500/20 rounded-2xl border border-amber-500/30 bg-card">
        {transactions.map((t) => (
          <NeedsReviewRow
            key={t.id}
            transaction={t}
            categories={categories}
            selectionMode={selecting}
            selected={selectedIds.has(t.id)}
            onToggleSelected={() => toggleSelected(t.id)}
          />
        ))}
      </ul>
    </section>
  );
}
