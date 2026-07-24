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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-card-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-2xl p-1 text-foreground-muted hover:bg-white/10 hover:text-white"
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
