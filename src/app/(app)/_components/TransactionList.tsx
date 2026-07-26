"use client";

import { useMemo, useState, useTransition } from "react";
import { TransactionRow } from "./TransactionRow";
import { bulkUpdateTransactions, deleteTransactions } from "../actions";
import { ChevronDownIcon, SearchIcon } from "./icons";
import { useToast } from "./ToastProvider";
import { usePersistedState } from "@/lib/use-persisted-state";
import type { RecurringInterval } from "@/lib/recurring";

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

type SortMode = "date" | "expense-first" | "income-first" | "category";

const SORT_CYCLE: SortMode[] = ["date", "expense-first", "income-first", "category"];
const SORT_LABEL: Record<SortMode, string> = {
  date: "Date",
  "expense-first": "Expenses first",
  "income-first": "Income first",
  category: "Category",
};

// "Today"/"Yesterday", then a plain formatted date — same convention most
// finance apps use so recent activity reads at a glance.
function formatDayLabel(dateISO: string): string {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (dateISO === todayKey) return "Today";
  if (dateISO === yesterdayKey) return "Yesterday";

  const d = new Date(`${dateISO}T00:00:00`);
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

// Items arrive date-sorted (descending), so a single adjacent-run pass is
// enough to cluster same-day transactions under one header — no need to
// key by a map. Only meaningful when the list is still in date order; a
// category/type sort scrambles the date axis, so callers should skip this
// for any other sort mode.
function groupByDay(items: Transaction[]) {
  const groups: { key: string; label: string; items: Transaction[] }[] = [];
  for (const t of items) {
    const last = groups[groups.length - 1];
    if (last && last.key === t.date) {
      last.items.push(t);
    } else {
      groups.push({ key: t.date, label: formatDayLabel(t.date), items: [t] });
    }
  }
  return groups;
}

function sortItems(items: Transaction[], mode: SortMode): Transaction[] {
  if (mode === "date") return items;
  // Array.prototype.sort is stable, so ties keep their existing (date-desc)
  // order — e.g. "expense-first" groups by type without scrambling dates.
  const sorted = [...items];
  if (mode === "expense-first") {
    sorted.sort((a, b) => Number(a.type === "income") - Number(b.type === "income"));
  } else if (mode === "income-first") {
    sorted.sort((a, b) => Number(a.type === "expense") - Number(b.type === "expense"));
  } else if (mode === "category") {
    sorted.sort((a, b) =>
      (a.category?.name ?? "Uncategorized").localeCompare(b.category?.name ?? "Uncategorized"),
    );
  }
  return sorted;
}

export function TransactionList({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkType, setBulkType] = useState<"" | "income" | "expense">("");
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Persisted (not just local) so search/filter/sort survive navigating to
  // another tab and back, instead of resetting every time this remounts.
  const [sortMode, setSortMode] = usePersistedState<SortMode>("transactions:sort", "date");
  const [search, setSearch] = usePersistedState("transactions:search", "");
  const [typeFilter, setTypeFilter] = usePersistedState<"all" | "expense" | "income">(
    "transactions:type-filter",
    "all",
  );

  const filtersActive = search !== "" || typeFilter !== "all" || sortMode !== "date";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setSortMode("date");
  }

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (query && !t.description.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [transactions, search, typeFilter]);

  const monthGroups = useMemo(() => {
    const groups = new Map<string, { label: string; items: Transaction[] }>();
    for (const t of visibleTransactions) {
      const key = t.date.slice(0, 7); // "YYYY-MM"
      if (!groups.has(key)) {
        const [year, month] = key.split("-").map(Number);
        const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        groups.set(key, { label, items: [] });
      }
      groups.get(key)!.items.push(t);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
  }, [visibleTransactions]);

  function resetSelection() {
    setSelecting(false);
    setSelectedIds(new Set());
    setConfirmingDelete(false);
    setBulkCategory("");
    setBulkType("");
  }

  function toggleSelecting() {
    if (selecting) resetSelection();
    else setSelecting(true);
  }

  function toggleTypeFilter(type: "expense" | "income") {
    setTypeFilter((prev) => (prev === type ? "all" : type));
  }

  function toggleMonthCollapsed(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleBulkTypeChange(next: "" | "income" | "expense") {
    setBulkType(next);
    setBulkCategory("");
  }

  const bulkCategoryOptions = bulkType
    ? categories.filter((c) => c.type === bulkType)
    : categories;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isMonthFullySelected(items: Transaction[]) {
    return items.length > 0 && items.every((t) => selectedIds.has(t.id));
  }

  function toggleMonthSelected(items: Transaction[]) {
    const allSelected = isMonthFullySelected(items);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const t of items) {
        if (allSelected) next.delete(t.id);
        else next.add(t.id);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    const count = selectedIds.size;
    startTransition(async () => {
      await deleteTransactions([...selectedIds]);
      resetSelection();
      showToast(`${count} transaction${count === 1 ? "" : "s"} deleted`);
    });
  }

  function handleApplyBulkEdit() {
    const updates: { category?: string; type?: "income" | "expense" } = {};
    if (bulkCategory) updates.category = bulkCategory;
    if (bulkType) updates.type = bulkType;
    if (Object.keys(updates).length === 0) return;

    const count = selectedIds.size;
    startTransition(async () => {
      await bulkUpdateTransactions([...selectedIds], updates);
      resetSelection();
      showToast(`${count} transaction${count === 1 ? "" : "s"} updated`);
    });
  }

  return (
    <section>
      {transactions.length > 0 && (
        <div className="mb-4">
          {/* Dominant row: search gets the width, since it's the control
              most likely to be reached for first. */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              aria-label="Search transactions by description"
              className="min-h-11 w-full rounded-xl bg-input-bg py-2.5 pr-3 pl-10 text-sm text-foreground placeholder:text-foreground-muted"
            />
          </div>

          {/* Secondary row: everything else, tighter and condensed. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => toggleTypeFilter("expense")}
                aria-pressed={typeFilter === "expense"}
                className={`flex min-h-11 items-center rounded-full px-3 py-1.5 text-xs font-medium ${
                  typeFilter === "expense"
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => toggleTypeFilter("income")}
                aria-pressed={typeFilter === "income"}
                className={`flex min-h-11 items-center rounded-full px-3 py-1.5 text-xs font-medium ${
                  typeFilter === "income"
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Income
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort transactions by"
                className="min-h-11 rounded-xl bg-input-bg px-2 py-1 text-xs text-foreground"
              >
                {SORT_CYCLE.map((mode) => (
                  <option key={mode} value={mode}>
                    {SORT_LABEL[mode]}
                  </option>
                ))}
              </select>

              <button
                onClick={toggleSelecting}
                className="flex min-h-11 items-center rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
              >
                {selecting ? "Cancel" : "Select"}
              </button>

              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="-my-2 -mx-1 px-1 py-2 text-xs font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selecting && (
        <div className="mb-3 space-y-3 rounded-xl bg-card px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">{selectedIds.size} selected</span>
            {!confirmingDelete ? (
              <button
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmingDelete(true)}
                className="flex min-h-11 items-center rounded-xl font-bold text-attention hover:text-attention-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete selected
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-foreground-muted">
                  Delete {selectedIds.size} transaction
                  {selectedIds.size === 1 ? "" : "s"}?
                </span>
                <button
                  disabled={isPending}
                  onClick={handleDeleteSelected}
                  className="-my-2 -mx-1 px-1 py-2 font-bold text-attention hover:text-attention-hover disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="-my-2 -mx-1 px-1 py-2 text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!confirmingDelete && (
            <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
              <select
                value={bulkType}
                onChange={(e) =>
                  handleBulkTypeChange(e.target.value as "" | "income" | "expense")
                }
                className="min-h-11 rounded-xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">Set type…</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="min-h-11 rounded-xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">Set category…</option>
                {bulkCategoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                disabled={
                  selectedIds.size === 0 ||
                  (!bulkCategory && !bulkType) ||
                  isPending
                }
                onClick={handleApplyBulkEdit}
                className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply to selected
              </button>
            </div>
          )}
        </div>
      )}

      {monthGroups.length > 0 ? (
        <div className="space-y-6">
          {monthGroups.map((group) => {
            const collapsed = collapsedMonths.has(group.key);
            return (
              <div key={group.key}>
                <div className="mb-2 flex items-center gap-1">
                  {selecting && (
                    <label className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isMonthFullySelected(group.items)}
                        onChange={() => toggleMonthSelected(group.items)}
                        aria-label={`Select all transactions in ${group.label}`}
                        className="h-4 w-4 rounded border-card-border"
                      />
                    </label>
                  )}
                  <button
                    onClick={() => toggleMonthCollapsed(group.key)}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} ${group.label}`}
                    className="-ml-2.5 flex min-h-11 flex-1 items-center gap-1.5 py-1"
                  >
                    <ChevronDownIcon
                      className="h-4 w-4 text-foreground-muted transition-transform duration-200"
                      style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                    />
                    <h3 className="text-sm font-bold text-foreground">{group.label}</h3>
                  </button>
                </div>
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
                >
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-card-border rounded-xl bg-card">
                      {sortMode === "date"
                        ? groupByDay(group.items).map((day) => (
                            <li key={day.key}>
                              <p className="px-4 pt-2.5 pb-1 text-xs text-foreground-muted">
                                {day.label}
                              </p>
                              <ul className="divide-y divide-card-border">
                                {day.items.map((t) => (
                                  <TransactionRow
                                    key={t.id}
                                    transaction={t}
                                    categories={categories}
                                    selectionMode={selecting}
                                    selected={selectedIds.has(t.id)}
                                    onToggleSelected={() => toggleSelected(t.id)}
                                  />
                                ))}
                              </ul>
                            </li>
                          ))
                        : sortItems(group.items, sortMode).map((t) => (
                            <TransactionRow
                              key={t.id}
                              transaction={t}
                              categories={categories}
                              selectionMode={selecting}
                              selected={selectedIds.has(t.id)}
                              onToggleSelected={() => toggleSelected(t.id)}
                            />
                          ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">
          {transactions.length === 0
            ? "No transactions yet."
            : search
              ? `No transactions match "${search}".`
              : "No transactions match this filter."}
        </p>
      )}
    </section>
  );
}
