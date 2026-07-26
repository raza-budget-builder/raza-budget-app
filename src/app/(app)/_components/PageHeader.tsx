import Link from "next/link";
import { logout } from "../actions";
import { LogOutIcon, PersonIcon } from "./icons";

export function PageHeader({
  title,
  subtitle,
  extra,
}: {
  title: string;
  // Opt-in — pages that don't pass this render exactly as before. Dashboard
  // uses it for the current period (e.g. "July 2026"), sized/weighted
  // distinctly from the title rather than sitting on the same plain line.
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-foreground-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        {extra}
        <Link
          href="/profile"
          aria-label="Profile"
          title="Profile"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground-muted hover:text-foreground"
        >
          <PersonIcon className="h-5 w-5" />
        </Link>
        <form action={logout}>
          <button
            aria-label="Log out"
            title="Log out"
            className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-foreground"
          >
            <LogOutIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
