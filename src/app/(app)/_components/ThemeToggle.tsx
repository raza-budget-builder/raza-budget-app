"use client";

import { useTheme } from "./ThemeProvider";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-foreground"
    >
      {isLight ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
