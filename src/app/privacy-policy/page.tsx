import Link from "next/link";

export const metadata = { title: "Privacy Policy — Steward" };

// Sans-serif throughout (font-editorial is reserved for AI-generated insight
// text elsewhere in the app — this is legal/factual copy). Comfortable
// reading width (max-w-2xl) rather than full-bleed, since this is a
// text-heavy page meant to be read start to finish.
export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <Link href="/login" className="text-sm text-foreground-muted hover:text-foreground">
            ← Back
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Privacy Policy — Steward</h1>
          <p className="mt-1 text-sm text-foreground-muted">Last updated: July 28, 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-bold text-foreground">1. Introduction</h2>
            <p className="mt-2 text-foreground-muted">
              Steward (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides a personal
              finance and budgeting application (&quot;the App,&quot; &quot;the
              Service&quot;). This Privacy Policy explains what information we collect, how
              we use it, and the choices you have.
            </p>
            <p className="mt-2 text-foreground-muted">
              By using Steward, you agree to the collection and use of information as
              described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">2. Information We Collect</h2>

            <h3 className="mt-4 font-semibold text-foreground">Account information</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>Name</li>
              <li>Email address</li>
              <li>Password (stored securely, hashed — never in plain text)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">Financial information</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>Transaction data you manually enter or upload via CSV bank statement import</li>
              <li>Income and expense categorization</li>
              <li>Budget goals you set</li>
              <li>Recurring transaction patterns</li>
              <li>Stated financial goals (from onboarding/profile)</li>
              <li>Income type (salaried, freelance, small business, etc.)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">
              Automatically collected information
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                Basic usage data, such as which features are used and general app
                performance metrics
              </li>
              <li>Device and browser type, for compatibility and troubleshooting purposes</li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">
              We do NOT currently collect:
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                Direct bank login credentials. Steward does not currently offer direct bank
                account linking — users manually upload bank statements in CSV format, which
                are processed and then discarded once transactions are imported.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">3. How We Use Your Information</h2>
            <p className="mt-2 text-foreground-muted">We use collected information to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>Provide budgeting, categorization, and financial insight features</li>
              <li>
                Generate AI-powered insights (spending pattern analysis, goal tracking, cash
                flow projections)
              </li>
              <li>Maintain and improve the App</li>
              <li>Communicate with you about your account (e.g. password resets, service updates)</li>
            </ul>
            <p className="mt-3 text-foreground-muted">
              We do not currently send marketing emails. If this changes in the future, we
              will only do so with your consent, and you will be able to opt out at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">
              4. AI Processing of Financial Data
            </h2>
            <p className="mt-2 text-foreground-muted">Steward uses AI (large language models) to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>Categorize transactions imported via CSV</li>
              <li>Detect recurring transactions and potential duplicate transfers</li>
              <li>Generate spending insights and narrative summaries</li>
            </ul>
            <p className="mt-3 text-foreground-muted">
              Financial data processed by our AI systems is used solely to generate insights
              and categorizations for your account, and is not used to train third-party AI
              models. We work with reputable AI infrastructure providers who maintain their
              own data handling and security standards.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">5. Data Storage and Security</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                Your data is stored using Supabase, a third-party database and backend
                service, with encryption applied both in transit and at rest.
              </li>
              <li>
                We take reasonable measures to protect your information, but no method of
                electronic storage is 100% secure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">6. Data Sharing</h2>
            <p className="mt-2 text-foreground-muted">
              We do not sell your personal or financial information.
            </p>
            <p className="mt-3 text-foreground-muted">We may share information with:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                Service providers who help operate the App (e.g. Supabase for data storage,
                AI providers for insight generation, Vercel for hosting)
              </li>
              <li>
                A payment processor for paid subscription tiers. Payment card details are
                handled directly by our payment processor and are never stored on
                Steward&apos;s own servers.
              </li>
              <li>As required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">7. Your Rights and Choices</h2>
            <p className="mt-2 text-foreground-muted">
              Depending on your location, you may have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
            <p className="mt-3 text-foreground-muted">
              Deleting your account removes your personal and financial data from our active
              systems. Residual copies may persist briefly in routine backups before being
              fully purged.
            </p>
            <p className="mt-3 text-foreground-muted">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:support@stewardapp.com"
                className="text-foreground underline hover:text-accent"
              >
                support@stewardapp.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">8. Data Retention</h2>
            <p className="mt-2 text-foreground-muted">
              We retain your transaction and account data for as long as your account remains
              active. Uploaded CSV bank statement files are processed to extract transaction
              data and are not retained after import is complete. If you delete your account,
              your data is removed from our active systems as described in Section 7.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">9. Children&apos;s Privacy</h2>
            <p className="mt-2 text-foreground-muted">
              Steward is not directed at children under 13 (or the relevant age of digital
              consent in your jurisdiction), and we do not knowingly collect information from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">10. International Users</h2>
            <p className="mt-2 text-foreground-muted">
              Steward is operated from Canada. If you use the App from outside Canada, your
              information will be transferred to and processed in Canada, where privacy laws
              may differ from those in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">11. Changes to This Policy</h2>
            <p className="mt-2 text-foreground-muted">
              We may update this Privacy Policy from time to time. We will notify users of
              material changes via email or an in-app notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">12. Contact Us</h2>
            <p className="mt-2 text-foreground-muted">
              If you have questions about this Privacy Policy, contact us at:{" "}
              <a
                href="mailto:support@stewardapp.com"
                className="text-foreground underline hover:text-accent"
              >
                support@stewardapp.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
