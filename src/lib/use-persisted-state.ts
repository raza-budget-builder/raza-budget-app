import { useEffect, useState } from "react";

// Backs a piece of client state with sessionStorage, so it survives
// navigating away and back within the same tab/session without needing to
// thread it through the URL or a server round-trip. Falls back to the
// default silently if storage is unavailable (SSR, private browsing).
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = window.sessionStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage full/unavailable — the app still works, it just won't persist.
    }
  }, [key, state]);

  return [state, setState] as const;
}
