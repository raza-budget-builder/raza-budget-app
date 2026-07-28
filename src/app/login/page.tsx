import Link from "next/link";
import { login, loginWithGoogle, signup } from "./actions";
import { AiWelcomeMessage } from "./AiWelcomeMessage";
import { ThemeToggle } from "../(app)/_components/ThemeToggle";
import { GoogleIcon } from "../(app)/_components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string; confirmed?: string }>;
}) {
  const { error, checkEmail, confirmed } = await searchParams;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-6 w-full max-w-sm sm:max-w-lg md:max-w-xl">
        <AiWelcomeMessage />
      </div>

      <div className="w-full max-w-sm space-y-6 rounded-xl bg-card p-8 sm:max-w-md">
        <p className="text-sm text-foreground-muted">
          Enter your email and password to sign in, or create an account.
        </p>

        {error && <p className="rounded-xl bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}
        {checkEmail && (
          <p className="rounded-xl bg-positive/10 px-3 py-2 text-sm text-positive">
            Check your email to confirm your account, then log in below.
          </p>
        )}
        {confirmed && (
          <p className="rounded-xl bg-positive/10 px-3 py-2 text-sm text-positive">
            Your email has been confirmed — you can log in now.
          </p>
        )}

        <form className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground-muted"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block min-h-11 w-full rounded-xl bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground-muted"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 block min-h-11 w-full rounded-xl bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* Log in listed first — not just visually (a bordered secondary
              button, same treatment as onboarding's "Skip for now"), but in
              DOM order too: with two submit buttons in one form, pressing
              Enter in a field triggers whichever one comes first in the
              markup. Most visitors here already have an account, so Enter
              should log them in, not attempt a signup. */}
          <div className="flex flex-col gap-1 pt-2">
            <button
              formAction={login}
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Sign up
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-card-border" />
          <span className="text-xs text-foreground-muted">or</span>
          <div className="h-px flex-1 bg-card-border" />
        </div>

        <form>
          <button
            formAction={loginWithGoogle}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </button>
        </form>
      </div>

      <p className="max-w-sm text-center text-xs text-foreground-muted/80 sm:max-w-lg md:max-w-xl">
        *All advice generated from the analysis of your personal finances is not to be taken as
        financial advice — always seek professional help before investing or buying financial
        products.
      </p>

      <p className="text-xs text-foreground-muted/80">
        <Link href="/privacy-policy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
      </p>
    </div>
  );
}
