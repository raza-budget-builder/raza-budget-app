import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "./(app)/_components/ThemeProvider";
import "./globals.css";

// Runs before hydration so the correct palette is already applied by first
// paint — without this, a returning light-theme user would flash dark on
// every load until ThemeProvider's effect catches up.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The app's "editorial" voice font — used for AI-generated narrative text
// (e.g. the Insights weekly summary) to visually set it apart from the UI's
// sans-serif chrome.
const editorialSerif = Source_Serif_4({
  variable: "--font-serif-editorial",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Steward",
  description: "A personal budgeting app",
  verification: {
    google: "9rLa25-Ilh_fcezk9MFal4rjytAwnNA118B0-o3JX54",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorialSerif.variable} h-full antialiased`}
      // The blocking script below sets data-theme on this element before
      // React hydrates, so the server-rendered markup will never match it —
      // an expected, harmless mismatch (React docs' documented escape hatch
      // for exactly this pattern), not a real bug.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
