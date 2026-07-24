"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Unmounting when closed (rather than hiding via CSS) is deliberate — it
  // resets whatever form/wizard state lives inside each time the modal reopens.
  if (!open) return null;

  // Portaled to document.body so a modal opened from inside a <li> (e.g. a
  // transaction row) never ends up as a stray non-<li> child of a <ul>.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        // Full-screen sheet below sm (no rounding/border — it fills the
        // viewport like a native mobile sheet, with safe-area padding so
        // content and controls clear the home-indicator/notch), centered
        // floating card at sm+ same as before.
        className="flex h-full w-full flex-col overflow-y-auto bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:flex-none sm:rounded-2xl sm:border sm:border-card-border sm:pb-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-2xl text-foreground-muted hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
