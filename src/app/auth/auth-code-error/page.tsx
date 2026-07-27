import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-8 text-center">
        <h1 className="text-lg font-bold text-foreground">Link expired or already used</h1>
        <p className="text-sm text-foreground-muted">
          That confirmation link didn&apos;t work — it may have expired or already been used.
          Try signing up or logging in again.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
