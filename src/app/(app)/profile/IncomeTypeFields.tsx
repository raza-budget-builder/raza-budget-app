"use client";

import { useState } from "react";
import { INCOME_TYPES, INCOME_TYPE_LABEL, type IncomeType } from "@/lib/income-type";

// Checkboxes visually styled as toggle pills — the sr-only input keeps
// native form semantics (formData.getAll("income_type") on submit) while
// the label wrapping it (clicking a <label> toggles its checkbox natively)
// gets the same pill look used in the onboarding flow this mirrors.
export function IncomeTypeFields({ defaultValue }: { defaultValue: IncomeType[] }) {
  const [selected, setSelected] = useState<IncomeType[]>(defaultValue);

  function toggle(value: IncomeType) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-foreground-muted">
        How do you earn income?
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {INCOME_TYPES.map((value) => (
          <label key={value} className="cursor-pointer">
            <input
              type="checkbox"
              name="income_type"
              value={value}
              checked={selected.includes(value)}
              onChange={() => toggle(value)}
              className="sr-only"
            />
            <span
              className={`flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium ${
                selected.includes(value)
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {INCOME_TYPE_LABEL[value]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
