"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastVariant = "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;
// Must match the transition duration on the toast element below — gives
// the fade-out somewhere to actually play before the toast is removed from
// the list entirely.
const EXIT_ANIMATION_MS = 200;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// One toast's own mount/visible split, same pattern as Modal — lets it fade
// out instead of just vanishing when the provider removes it from state.
function ToastItem({ toast, onExited }: { toast: Toast; onExited: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(dismissTimer);
    };
    // No deps needed — a given ToastItem instance is always for the same
    // toast (keyed by id in the parent), so this is meant to run once.
  }, []);

  useEffect(() => {
    if (visible) return;
    const timeout = setTimeout(onExited, EXIT_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [visible, onExited]);

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
        toast.variant === "error" ? "bg-critical/10 text-critical" : "bg-card text-foreground"
      } ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onExited={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
