// Decorative tick-rail (spade.com's ruler/measuring-tape motif) — a column
// of alternating long/short 1px marks running down a section's edge. Purely
// decorative (aria-hidden), so screen readers skip it entirely. Needs a
// `relative`-positioned ancestor to anchor against; hidden below lg since
// there's no side gutter to sit in at narrower widths.
const TICK_COUNT = 16;

export function RulerTicks({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-y-0 hidden w-6 flex-col justify-between py-1 lg:flex ${
        side === "left" ? "left-0 items-start" : "right-0 items-end"
      }`}
    >
      {Array.from({ length: TICK_COUNT }).map((_, i) => (
        <div key={i} className={`h-px bg-foreground/20 ${i % 3 === 0 ? "w-5" : "w-2.5"}`} />
      ))}
    </div>
  );
}
