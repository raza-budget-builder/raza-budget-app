"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { TAP_FEEDBACK } from "@/lib/motion";

// How long the exit animation gets to finish before the modal actually
// unmounts — must match the duration in the transition classes below.
const EXIT_ANIMATION_MS = 180;

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
  // `mounted` keeps the modal in the DOM for the exit animation's duration
  // after `open` goes false; `visible` drives the actual enter/exit CSS
  // state. Without this split, closing would just vanish instantly — there
  // has to be a frame where it's still mounted but already transitioning
  // toward "closed" for the animation to be visible at all.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Adjusting state during render in response to `open` changing — React's
  // documented alternative to an effect for "sync internal state to a
  // changing prop" (see "Adjusting state when a prop changes" in the React
  // docs) — rather than an effect that calls setState synchronously, which
  // just adds an extra render pass for the same result. Opening mounts
  // immediately; closing starts the fade-out immediately, with the actual
  // unmount handled by the timer effect below.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setMounted(true);
    else setVisible(false);
  }

  useEffect(() => {
    if (!open) return;
    // One frame late so the browser paints the pre-animation (hidden)
    // state first — flipping to visible any earlier would skip straight to
    // the end state with nothing to transition. This is a real
    // synchronize-with-the-browser's-paint-timing effect, not state that
    // could be derived during render.
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  useEffect(() => {
    if (open || !mounted) return;
    const timeout = setTimeout(() => setMounted(false), EXIT_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Unmounting once the exit animation finishes (rather than hiding via CSS
  // indefinitely) is deliberate — it resets whatever form/wizard state
  // lives inside each time the modal reopens.
  if (!mounted) return null;

  // Portaled to document.body so a modal opened from inside a <li> (e.g. a
  // transaction row) never ends up as a stray non-<li> child of a <ul>.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 transition-opacity duration-150 ease-out motion-reduce:transition-none sm:items-center sm:p-4 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
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
        // floating card at sm+ same as before. Scale+fade in from a slightly
        // shrunk, transparent starting point — the "gentle scale-up" entrance
        // — and the exact reverse on the way out, both driven by `visible`.
        className={`flex h-full w-full flex-col overflow-y-auto bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:flex-none sm:rounded-xl sm:border sm:border-card-border sm:pb-6 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-foreground/10 hover:text-foreground ${TAP_FEEDBACK}`}
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
