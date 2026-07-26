"use client";

import { useState } from "react";
import type { RecurringInterval } from "@/lib/recurring";

export function RecurringToggleFields({
  defaultChecked = false,
  defaultInterval = "monthly",
}: {
  defaultChecked?: boolean;
  defaultInterval?: RecurringInterval;
}) {
  const [enabled, setEnabled] = useState(defaultChecked);

  return (
    <div className="col-span-2 rounded-xl border border-card-border px-3 py-2">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isRecurring"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        This is recurring
      </label>
      {enabled && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-foreground-muted">
            Frequency
          </label>
          <select
            name="recurringInterval"
            defaultValue={defaultInterval}
            className="mt-1 min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      )}
    </div>
  );
}
