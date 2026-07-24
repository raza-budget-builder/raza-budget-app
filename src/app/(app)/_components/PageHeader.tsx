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
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        {extra}
        <Link
          href="/profile"
          aria-label="Profile"
          title="Profile"
          className="text-foreground-muted hover:text-white"
        >
          <PersonIcon className="h-5 w-5" />
        </Link>
        <form action={logout}>
          <button className="text-sm text-foreground-muted hover:text-white">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
