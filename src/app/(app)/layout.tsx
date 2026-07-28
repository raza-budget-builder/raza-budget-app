import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateDueRecurringTransactions } from "@/lib/recurring-generation";
import { BottomNav } from "./_components/BottomNav";
import { ToastProvider } from "./_components/ToastProvider";
import { ChatProvider } from "./_components/ChatProvider";

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
  const [, { data: profile, error: profileError }] = await Promise.all([
    generateDueRecurringTransactions(supabase, user.id),
    supabase
      .from("profiles")
      .select("tier, onboarding_completed_at")
      .eq("id", user.id)
      .single(),
  ]);

  // Logged, not just silently swallowed: a failed fetch here (e.g. a schema
  // migration that hasn't been run yet) means `profile` is null below, which
  // makes the onboarding-redirect check silently never fire — exactly the
  // kind of bug that's invisible without this line.
  if (profileError) console.error("profile fetch failed in (app) layout", profileError);

  // Checked once here (not duplicated per page) so any first-time signed-in
  // user — regardless of how they authenticated (email confirm, Google,
  // password without confirmation) — gets routed to onboarding before
  // reaching any (app) page. /onboarding lives outside this route group, so
  // there's no redirect loop.
  if (profile && !profile.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const showBusiness = profile?.tier === "entrepreneur";

  return (
    <ToastProvider>
      <ChatProvider>
        <div className="min-h-screen w-full bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-2xl px-4 py-10">{children}</div>
          <BottomNav showBusiness={showBusiness} />
        </div>
      </ChatProvider>
    </ToastProvider>
  );
}
