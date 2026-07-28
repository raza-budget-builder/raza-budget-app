import { ScrollReveal } from "./ScrollReveal";

// Explicitly placeholder — bracketed content, not fabricated quotes. Per
// the "no fake logo wall" instruction, there's no company-logo strip here
// either: this app is pre-launch with no recognizable users yet.
const TESTIMONIALS = [
  { quote: "[Add a real customer quote here]", name: "[Name]", role: "[Role]" },
  { quote: "[Add a real customer quote here]", name: "[Name]", role: "[Role]" },
  { quote: "[Add a real customer quote here]", name: "[Name]", role: "[Role]" },
];

export function TestimonialsSection() {
  return (
    <ScrollReveal>
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <p className="text-center text-sm font-medium text-foreground-muted">
          What early users are saying
        </p>
        <p className="mt-1 text-center text-xs text-foreground-muted/70 italic">
          Placeholder — replace with real quotes before this page goes live
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="rounded-xl bg-card p-5">
              <p className="text-sm leading-relaxed text-foreground-muted">
                &quot;{t.quote}&quot;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground-muted"
                >
                  ?
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-foreground-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
