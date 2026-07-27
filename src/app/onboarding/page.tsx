import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .single();

  // Already done — most likely a direct nav back here after finishing it
  // once. Send them on rather than showing it again.
  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return <OnboardingFlow />;
}
