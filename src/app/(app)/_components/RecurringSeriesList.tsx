"use client";

import { useState, useTransition } from "react";
import {
  reactivateRecurringGroupAction,
  stopRecurringGroupAction,
  updateRecurringGroupAction,
} from "../actions";
import { AMOUNT_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { ChevronDownIcon, PauseIcon, PencilIcon } from "./icons";
import type { RecurringInterval } from "@/lib/recurring";

type Category = { id: string; name: string; type: "income" | "expense" };

type Series = {
  groupId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  interval: RecurringInterval;
  active: boolean;
  nextDate: string;
};

const INTERVAL_LABEL: Record<RecurringInterval, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export function RecurringSeriesList({
  series,
  categories,
}: {
  series: Series[];
  categories: Category[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card p-6">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between"
      >
        <h2 className="font-bold text-white">Recurring series ({series.length})</h2>
        <ChevronDownIcon
          className="h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-200"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {expanded && (
        <div className="mt-4">
          {series.length === 0 ? (
            <p className="text-sm text-foreground-muted">No recurring series yet.</p>
          ) : (
            <ul className="divide-y divide-card-border">
              {series.map((s) => (
                <RecurringSeriesRow key={s.groupId} series={s} categories={categories} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function RecurringSeriesRow({
  series,
  categories,
}: {
  series: Series;
  categories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(series.amount));
  const [category, setCategory] = useState(series.category ?? "");
  const [frequency, setFrequency] = useState<RecurringInterval>(series.interval);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = categories.filter((c) => c.type === series.type);

  function handleSave() {
    startTransition(async () => {
      await updateRecurringGroupAction(series.groupId, {
        amount: Number(amount),
        category: category || null,
        interval: frequency,
      });
      setEditing(false);
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      if (series.active) {
        await stopRecurringGroupAction(series.groupId);
      } else {
        await reactivateRecurringGroupAction(series.groupId);
      }
    });
  }

  if (editing) {
    return (
      <li className="grid grid-cols-2 gap-3 py-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringInterval)}
            className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-foreground-muted">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
          >
            <option value="">Uncategorized</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-2xl bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-2xl border border-card-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center justify-between gap-4 py-3 text-sm ${
        series.active ? "" : "opacity-50"
      }`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-bold text-white">
          <span className="truncate">{series.description}</span>
          {!series.active && (
            <span className="shrink-0 rounded-full border border-card-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              Stopped
            </span>
          )}
        </p>
        <p className="text-foreground-muted">
          {INTERVAL_LABEL[series.interval]}
          {series.nextDate && ` · Next: ${series.nextDate}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`font-bold ${AMOUNT_TEXT_CLASS[series.type]}`}>
          {formatSignedAmount(series.amount, series.type)}
        </span>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit series"
          title="Edit"
          className="rounded-2xl p-1.5 text-foreground-muted hover:bg-white/10 hover:text-white"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          onClick={handleToggleActive}
          disabled={isPending}
          aria-label={series.active ? "Stop recurring" : "Reactivate recurring"}
          title={series.active ? "Stop" : "Reactivate"}
          className={`rounded-2xl p-1.5 hover:bg-white/10 disabled:opacity-50 ${
            series.active
              ? "text-foreground-muted hover:text-[#fb923c]"
              : "text-[#4ade80] hover:text-[#86efac]"
          }`}
        >
          <PauseIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
