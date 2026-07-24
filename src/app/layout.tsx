import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

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
  title: "Personal Budget",
  description: "A personal budgeting app",
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
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
