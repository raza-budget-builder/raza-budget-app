import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateDueRecurringTransactions } from "@/lib/recurring-generation";
import { BottomNav } from "./_components/BottomNav";
import { ToastProvider } from "./_components/ToastProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check-on-open: no backend scheduler exists, so this runs once per
  // request here instead — effectively on every app load/navigation.
  // Independent of the profile lookup below, so they run concurrently
  // rather than one blocking the other on every single navigation.
  const [, { data: profile }] = await Promise.all([
    generateDueRecurringTransactions(supabase, user.id),
    supabase.from("profiles").select("tier").eq("id", user.id).single(),
  ]);

  const showBusiness = profile?.tier === "entrepreneur";

  return (
    <ToastProvider>
      <div className="min-h-screen w-full bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl px-4 py-10">{children}</div>
        <BottomNav showBusiness={showBusiness} />
      </div>
    </ToastProvider>
  );
}
