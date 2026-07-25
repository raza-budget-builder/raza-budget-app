"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BusinessIcon,
  DashboardIcon,
  GoalsIcon,
  InsightsIcon,
  TransactionsIcon,
} from "./icons";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const BASE_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", Icon: TransactionsIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/insights", label: "Insights", Icon: InsightsIcon },
];

const BUSINESS_TAB: Tab = { href: "/business", label: "Business", Icon: BusinessIcon };

export function BottomNav({ showBusiness }: { showBusiness: boolean }) {
  const pathname = usePathname();
  const tabs = showBusiness ? [...BASE_TABS, BUSINESS_TAB] : BASE_TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-card-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-auto grid max-w-2xl"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? "text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <tab.Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
