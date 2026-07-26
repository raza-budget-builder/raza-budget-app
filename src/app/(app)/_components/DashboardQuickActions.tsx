"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { AddTransactionForm } from "./AddTransactionForm";
import { ImportWizard } from "./ImportWizard";
import { PlusIcon, ImportIcon } from "./icons";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export function DashboardQuickActions({
  categories,
  needsReviewCount,
}: {
  categories: Category[];
  needsReviewCount: number;
}) {
  const [openModal, setOpenModal] = useState<"add" | "upload" | null>(null);

  return (
    <>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setOpenModal("add")}
          className="flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Add manually</span>
        </button>
        <button
          onClick={() => setOpenModal("upload")}
          className="relative flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          <ImportIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Upload CSV</span>
          {needsReviewCount > 0 && (
            <span
              aria-label={`${needsReviewCount} needs review`}
              className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-attention px-1 text-[10px] font-bold text-gray-900"
            >
              {needsReviewCount}
            </span>
          )}
        </button>
      </div>

      <Modal
        open={openModal === "add"}
        onClose={() => setOpenModal(null)}
        title="Add a transaction"
      >
        <AddTransactionForm categories={categories} />
      </Modal>

      <Modal open={openModal === "upload"} onClose={() => setOpenModal(null)} title="Upload CSV">
        <ImportWizard />
      </Modal>
    </>
  );
}
