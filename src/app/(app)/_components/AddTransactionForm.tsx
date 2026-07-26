"use client";

import { useState } from "react";
import { addTransaction } from "../actions";
import { RecurringConfirmModal } from "./RecurringConfirmModal";
import { RecurringToggleFields } from "./RecurringToggleFields";
import { useToast } from "./ToastProvider";
import type { PendingRecurringCandidate } from "@/lib/recurring";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export function AddTransactionForm({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("");
  // Bumped after every successful submit to force the whole form to remount.
  // React's automatic post-action form reset otherwise mutates the native
  // DOM directly, which can leave controlled elements (the category select,
  // the type radios) showing a stale value that no longer matches React's
  // state — remounting sidesteps that conflict entirely.
  const [formKey, setFormKey] = useState(0);
  const [pendingCandidate, setPendingCandidate] = useState<PendingRecurringCandidate | null>(
    null,
  );
  const { showToast } = useToast();

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleTypeChange(next: "expense" | "income") {
    setType(next);
    setCategory("");
  }

  async function handleSubmit(formData: FormData) {
    const result = await addTransaction(formData);
    setType("expense");
    setCategory("");
    setFormKey((k) => k + 1);
    showToast("Transaction added");
    if (result?.pendingRecurring) setPendingCandidate(result.pendingRecurring);
  }

  return (
    <>
      <form key={formKey} action={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted">Date</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted">Amount</label>
          <input
            type="number"
            step="0.01"
            name="amount"
            required
            placeholder="0.00"
            className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div className="col-span-2">
          <span className="block text-xs font-medium text-foreground-muted">Type</span>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                name="type"
                value="expense"
                checked={type === "expense"}
                onChange={() => handleTypeChange("expense")}
              />
              Expense
            </label>
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                name="type"
                value="income"
                checked={type === "income"}
                onChange={() => handleTypeChange("income")}
              />
              Income
            </label>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-foreground-muted">Category</label>
          <select
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
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
            className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
          />
        </div>
        <RecurringToggleFields />
        <div className="col-span-2">
          <button className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
            Add transaction
          </button>
        </div>
      </form>
      <RecurringConfirmModal
        candidate={pendingCandidate}
        onResolved={() => setPendingCandidate(null)}
      />
    </>
  );
}
