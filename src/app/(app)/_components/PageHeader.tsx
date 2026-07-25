import Link from "next/link";
import { logout } from "../actions";
import { PersonIcon } from "./icons";

export function PageHeader({
  title,
  extra,
}: {
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        {extra}
        <Link
          href="/profile"
          aria-label="Profile"
          title="Profile"
          className="flex h-11 w-11 items-center justify-center text-foreground-muted hover:text-foreground"
        >
          <PersonIcon className="h-5 w-5" />
        </Link>
        <form action={logout}>
          <button className="flex h-11 items-center px-2 text-sm text-foreground-muted hover:text-foreground">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
