"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

// Starts at "light" (the app's default theme) to match the server-rendered
// markup exactly (a lazy initializer that reads localStorage would return a
// different value during the client's hydration pass than the server
// produced, causing a real hydration mismatch — not just a lint complaint).
// The blocking script in the root layout already applies the correct
// data-theme attribute before paint, so the page never visibly flashes;
// this effect only brings React's own state in sync with it, which is a
// deliberate one-time exception to "don't setState in an effect."
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      // localStorage unavailable — stay on the default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore — worst case the choice doesn't persist across reloads.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      // Applied immediately, not left to the effect above, so the toggle
      // is never lost to a reload/HMR refresh landing in the gap between
      // this click and the next effect pass. Idempotent, so it's still
      // safe if Strict Mode invokes this updater twice.
      document.documentElement.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore — worst case the choice doesn't persist across reloads.
      }
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
