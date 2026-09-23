import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

// Landing-page-only font trio (Inter body / Hanken Grotesk headings /
// JetBrains Mono for eyebrow labels & stat callouts), modeled on spade.com's
// typography (a bold grotesque display face, a plain body sans, and a mono
// face for small technical-reading labels) — scoped to this route segment
// via CSS variables rather than swapping the app's own Geist Sans, which
// every other route keeps untouched. `contents` gives this wrapper zero
// layout effect; it exists purely to carry the font variables down to
// home/page.tsx.
const inter = Inter({ variable: "--font-landing-body", subsets: ["latin"] });
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-landing-display",
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-landing-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} contents`}
    >
      {children}
    </div>
  );
}
