import { login, signup } from "./actions";
import { AiWelcomeMessage } from "./AiWelcomeMessage";
import { ThemeToggle } from "../(app)/_components/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-6 w-full max-w-sm sm:max-w-lg md:max-w-xl">
        <AiWelcomeMessage />
      </div>

      <div className="w-full max-w-sm space-y-6 rounded-xl border border-card-border bg-card p-8 sm:max-w-md">
        <p className="text-sm text-foreground-muted">
          Enter your email and password to sign in, or create an account.
        </p>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
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
              className="mt-1 block w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
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
              className="mt-1 block w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-xl border border-card-border px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>

      <p className="max-w-sm text-center text-xs text-foreground-muted sm:max-w-lg md:max-w-xl">
        *All advice generated from the analysis of your personal finances is not to be taken as
        financial advice — always seek professional help before investing or buying financial
        products.
      </p>
    </div>
  );
}
