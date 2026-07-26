"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { AddTransactionForm } from "./AddTransactionForm";
import { ImportWizard } from "./ImportWizard";
import { ScreenshotImportWizard } from "./ScreenshotImportWizard";
import { PlusIcon, ImportIcon, ReceiptIcon } from "./icons";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

// A second entry point to the same three actions DashboardQuickActions
// exposes further down the page — collapsed into a round FAB at the top of
// the page so it's reachable without scrolling. Independent open/close
// state from DashboardQuickActions on purpose: they're two separate trigger
// UIs on the same page, not a shared control.
export function QuickActionsFab({
  categories,
  needsReviewCount,
}: {
  categories: Category[];
  needsReviewCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openModal, setOpenModal] = useState<"add" | "upload" | "screenshot" | null>(null);

  function openAction(modal: "add" | "upload" | "screenshot") {
    setExpanded(false);
    setOpenModal(modal);
  }

  return (
    <>
      <div className="relative">
        {/* Transparent click-catcher so tapping anywhere outside the expanded
            menu closes it, same click-outside convention as a dropdown. */}
        {expanded && (
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
        )}

        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Close quick actions" : "Quick actions"}
          aria-expanded={expanded}
          className="relative z-40 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-accent shadow-lg hover:bg-foreground/5 md:h-16 md:w-16"
        >
          <PlusIcon
            className={`h-5 w-5 transition-transform duration-300 ease-in-out md:h-6 md:w-6 ${
              expanded ? "rotate-45" : ""
            }`}
          />
        </button>

        {/* Absolutely positioned so opening it floats over the page instead
            of pushing the period toggles / Net hero it sits beside down.
            w-max is required: an absolutely-positioned box with only `left`
            set (no `right`) shrink-to-fits within its containing block's
            width, which here is just the 48-64px FAB button — without an
            explicit max-content width the menu (and everything in it) got
            squeezed into that width and overflow-hidden clipped the rest. */}
        <div
          className="absolute top-full left-0 z-40 mt-2 grid w-max transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div
              className={`flex flex-col items-start gap-2 transition-opacity duration-300 ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={() => openAction("add")}
                className="flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Add manually</span>
              </button>
              <button
                onClick={() => openAction("upload")}
                className="relative flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5"
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
              <button
                onClick={() => openAction("screenshot")}
                className="flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5"
              >
                <ReceiptIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Upload receipt</span>
              </button>
            </div>
          </div>
        </div>
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

      <Modal
        open={openModal === "screenshot"}
        onClose={() => setOpenModal(null)}
        title="Upload a receipt"
      >
        <ScreenshotImportWizard />
      </Modal>
    </>
  );
}
