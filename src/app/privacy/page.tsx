import Link from "next/link";

export const metadata = { title: "Privacy Policy — Steward" };

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <Link href="/login" className="text-sm text-foreground-muted hover:text-foreground">
            ← Back
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-1 text-sm text-foreground-muted">Last updated: July 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-foreground">
          <p>
            Steward (&quot;we,&quot; &quot;our,&quot; or &quot;the app&quot;) is a personal
            budgeting tool. This policy explains what information we collect, how it&apos;s
            used, and who we share it with.
          </p>

          <section>
            <h2 className="text-base font-bold text-foreground">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                <span className="text-foreground">Account information:</span> your email
                address and password, or — if you sign in with Google — your name, email
                address, and profile picture as provided by Google.
              </li>
              <li>
                <span className="text-foreground">Financial data you provide:</span>{" "}
                transactions you enter manually, import from a CSV file, or extract from an
                uploaded receipt/screenshot photo, along with the categories, budget goals,
                and recurring-transaction patterns you set up.
              </li>
              <li>
                <span className="text-foreground">Conversations with the AI assistant:</span>{" "}
                messages you send to the in-app chat feature.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">How we use it</h2>
            <p className="mt-2 text-foreground-muted">
              We use your information to operate the app: storing and displaying your
              transactions, calculating your spending summaries and goal progress, and
              generating the app&apos;s AI-assisted features — automatic transaction
              categorization, extracting transaction details from receipt/screenshot
              uploads, the conversational chat assistant, and periodic insight summaries
              (weekly spending recaps, drift alerts, goal-progress summaries). These
              AI features send the relevant transaction data to Anthropic&apos;s Claude API
              for processing.
            </p>
            <p className="mt-2 text-foreground-muted">
              We do not sell your information, and we do not use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Receipt and screenshot images</h2>
            <p className="mt-2 text-foreground-muted">
              When you upload a receipt photo or screenshot, the image is sent to
              Anthropic&apos;s API once, to extract the transaction details (date, amount,
              merchant, category). We store the extracted transaction data, not the image
              itself.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Third-party service providers</h2>
            <p className="mt-2 text-foreground-muted">
              We rely on the following providers to operate Steward, each of which processes
              data according to its own privacy policy:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-muted">
              <li>
                <span className="text-foreground">Supabase</span> — database hosting,
                authentication, and file storage.
              </li>
              <li>
                <span className="text-foreground">Anthropic</span> — AI processing (Claude
                API) for categorization, chat, receipt extraction, and insight generation.
              </li>
              <li>
                <span className="text-foreground">Vercel</span> — application hosting.
              </li>
              <li>
                <span className="text-foreground">Google</span> — if you choose to sign in
                with Google.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Data storage and security</h2>
            <p className="mt-2 text-foreground-muted">
              Your data is stored in Supabase with row-level security policies that restrict
              access to your own account only. Passwords are never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Your choices</h2>
            <p className="mt-2 text-foreground-muted">
              You can view, edit, or delete your transactions, categories, and goals at any
              time within the app. To request deletion of your account and associated data,
              contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Children&apos;s privacy</h2>
            <p className="mt-2 text-foreground-muted">
              Steward is not directed at, and is not intended for use by, anyone under 18.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Changes to this policy</h2>
            <p className="mt-2 text-foreground-muted">
              If this policy changes, we&apos;ll update the &quot;Last updated&quot; date
              above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">Contact</h2>
            <p className="mt-2 text-foreground-muted">
              Questions about this policy? Contact us at [your contact email].
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
