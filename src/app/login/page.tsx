import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-card-border bg-card p-8">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Personal Budget
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Enter your email and password to sign in, or create an account.
          </p>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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
              className="mt-1 block w-full rounded-2xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
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
              className="mt-1 block w-full rounded-2xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 rounded-2xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-2xl border border-card-border px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
