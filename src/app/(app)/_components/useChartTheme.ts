import { useTheme } from "./ThemeProvider";

// Recharts renders these as literal SVG attributes, not CSS, so they can't
// reference var(--foreground) etc. directly — this mirrors globals.css's
// two palettes in JS so charts repaint correctly when the theme toggles.
const CHART_COLORS = {
  dark: {
    grid: "#333d6c",
    tick: "#99a3c2",
    tooltipBg: "#1a2444",
    tooltipBorder: "#333d6c",
    ink: "#ffffff",
    cardStroke: "#1a2444",
  },
  light: {
    grid: "#17150f33",
    tick: "#5c5646",
    tooltipBg: "#fffdf7",
    tooltipBorder: "#17150f",
    ink: "#16150f",
    cardStroke: "#fffdf7",
  },
} as const;

export function useChartTheme() {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}
