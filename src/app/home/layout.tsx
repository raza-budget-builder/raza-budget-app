import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";

// Landing-page-only font pairing (DM Sans body, Plus Jakarta Sans headings),
// matching code-x.ai's typography — scoped to this route segment via CSS
// variables rather than swapping the app's own Geist Sans, which every other
// route keeps untouched. `contents` gives this wrapper zero layout effect;
// it exists purely to carry the two font variables down to home/page.tsx.
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${plusJakartaSans.variable} contents`}>{children}</div>
  );
}
