import Link from "next/link";

export const metadata = { title: "Terms of Service — Steward" };

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <Link href="/login" className="text-sm text-foreground-muted hover:text-foreground">
            ← Back
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-1 text-sm text-foreground-muted">Last updated: July 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-foreground">
          <p>
            These terms govern your use of Steward (&quot;the app&quot;). By creating an
            account, you agree to them.
          </p>

          <section>
            <h2 className="text-base font-bold text-foreground">The service</h2>
            <p className="mt-2 text-foreground-muted">
              Steward is a personal budgeting tool that helps you track income and expenses,
              set budget goals, and understand your spending using AI-assisted features
              (transaction categorization, a conversational assistant, receipt/screenshot
              import, and periodic spending insights).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Not financial advice</h2>
            <p className="mt-2 text-foreground-muted">
              All insights, summaries, and suggestions generated from analysis of your
              personal finances — including anything produced by the AI assistant — are not
              to be taken as financial advice. Always seek professional help before
              investing, borrowing, or making other financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Your account</h2>
            <p className="mt-2 text-foreground-muted">
              You&apos;re responsible for the accuracy of the information you provide and for
              keeping your account credentials secure. You&apos;re responsible for the
              accuracy of transactions you enter, import, or upload — automatic
              categorization and data extraction from receipts/screenshots are AI-assisted
              and may occasionally be wrong, so review what&apos;s recorded.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Acceptable use</h2>
            <p className="mt-2 text-foreground-muted">
              Don&apos;t use Steward for any unlawful purpose, attempt to access another
              user&apos;s data, or attempt to disrupt or compromise the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Termination</h2>
            <p className="mt-2 text-foreground-muted">
              We may suspend or terminate an account that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Service provided &quot;as is&quot;</h2>
            <p className="mt-2 text-foreground-muted">
              Steward is provided without warranties of any kind. We aren&apos;t liable for
              financial decisions made based on the app&apos;s output, or for losses arising
              from use of the service, to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Changes to these terms</h2>
            <p className="mt-2 text-foreground-muted">
              If these terms change, we&apos;ll update the &quot;Last updated&quot; date
              above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Contact</h2>
            <p className="mt-2 text-foreground-muted">
              Questions about these terms? Contact us at [your contact email].
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
