"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { AddTransactionForm } from "./AddTransactionForm";
import { ImportWizard } from "./ImportWizard";
import { ScreenshotImportWizard } from "./ScreenshotImportWizard";
import { PlusIcon, ImportIcon, ReceiptIcon } from "./icons";
import { useToast } from "./ToastProvider";
import { TAP_FEEDBACK } from "@/lib/motion";

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

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
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  // Set when a file was dropped onto the FAB rather than picked via a modal's
  // own file input — handed to the matching wizard so it can skip straight
  // to reading it. Reset on every openAction call (including the plain
  // click-to-open ones, via the default param below) so a stale drop never
  // leaks into an unrelated later open.
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  // dragenter/dragleave fire on every child element as the pointer crosses
  // them while dragging over the FAB, not just once for the whole region —
  // a plain boolean flickers off between children. Counting enter vs. leave
  // and only clearing at 0 is the standard fix.
  const dragDepth = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  // Lazy initializer (not an effect) reads ?openAction=manual|csv|receipt
  // once on the client so onboarding can route straight into the action the
  // user said they wanted next, instead of dropping them on an empty
  // dashboard. Guarded for SSR, where `window` doesn't exist yet.
  const [openModal, setOpenModal] = useState<"add" | "upload" | "screenshot" | null>(() => {
    if (typeof window === "undefined") return null;
    const action = new URLSearchParams(window.location.search).get("openAction");
    return action === "manual"
      ? "add"
      : action === "csv"
        ? "upload"
        : action === "receipt"
          ? "screenshot"
          : null;
  });

  // Strips the query param right after so refreshing or navigating back
  // doesn't reopen the modal — a pure external-system side effect (browser
  // history), not a setState call, so it doesn't trigger the
  // set-state-in-effect lint rule.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("openAction")) return;
    params.delete("openAction");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  function openAction(modal: "add" | "upload" | "screenshot", file: File | null = null) {
    setExpanded(false);
    setOpenModal(modal);
    setDroppedFile(file);
  }

  function closeModal() {
    setOpenModal(null);
    setDroppedFile(null);
  }

  // Drag-and-drop capture: dragging a CSV or photo anywhere over the FAB
  // (button or, once expanded, the pill menu) expands it and routes the
  // drop straight into the matching wizard — a desktop-only convenience
  // (HTML5 drag-and-drop has no touch equivalent, so this is inert on
  // mobile) for the same two file-based actions the pills already offer.
  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragOver(true);
    setExpanded(true);
  }

  function handleDragOver(e: React.DragEvent) {
    // Required for onDrop to ever fire — the browser's default is to
    // reject drops everywhere.
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (isCsvFile(file)) {
      openAction("upload", file);
    } else if (isImageFile(file)) {
      openAction("screenshot", file);
    } else {
      setExpanded(false);
      showToast("Drop a CSV file or a photo/screenshot to import it.", "error");
    }
  }

  return (
    <>
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
          className={`relative z-40 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-card-border bg-card text-accent shadow-lg transition-transform duration-150 hover:bg-foreground/5 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 md:h-16 md:w-16 ${
            isDragOver ? "scale-110 ring-4 ring-accent/40" : ""
          }`}
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
          className="absolute top-full -left-3 z-40 grid w-max transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            {/* p-3 gives shadow-lg's ~12px blur room to render fully on
                every side instead of getting hard-clipped in a straight
                line by the overflow-hidden above (needed for the
                grid-template-rows collapse animation) — -left-3 on the
                outer box above offsets this same 12px so the pills still
                line up visually where they did before. */}
            <div
              className={`flex flex-col items-start gap-2 p-3 transition-opacity duration-300 ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={() => openAction("add")}
                className={`flex min-h-11 items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5 ${TAP_FEEDBACK}`}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Add manually</span>
              </button>
              <button
                onClick={() => openAction("upload")}
                className={`relative flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5 ${TAP_FEEDBACK} ${
                  isDragOver ? "border-dashed border-accent" : "border-card-border"
                }`}
              >
                <ImportIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isDragOver ? "Drop CSV here" : "Upload CSV"}
                </span>
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
                className={`flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-foreground/5 ${TAP_FEEDBACK} ${
                  isDragOver ? "border-dashed border-accent" : "border-card-border"
                }`}
              >
                <ReceiptIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isDragOver ? "Drop photo here" : "Upload receipt"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={openModal === "add"} onClose={closeModal} title="Add a transaction">
        <AddTransactionForm categories={categories} />
      </Modal>

      <Modal open={openModal === "upload"} onClose={closeModal} title="Upload CSV">
        <ImportWizard initialFile={openModal === "upload" ? droppedFile : null} />
      </Modal>

      <Modal open={openModal === "screenshot"} onClose={closeModal} title="Upload a receipt">
        <ScreenshotImportWizard initialFile={openModal === "screenshot" ? droppedFile : null} />
      </Modal>
    </>
  );
}
