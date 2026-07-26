import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/PageHeader";

export default async function BusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const isEntrepreneur = profile?.tier === "entrepreneur";

  return (
    <div>
      <PageHeader title="Business" />
      <div className="rounded-xl border border-card-border bg-card p-6">
        {isEntrepreneur ? (
          <p className="text-sm text-foreground-muted">Coming soon.</p>
        ) : (
          <p className="text-sm text-foreground-muted">
            This feature is available on the Entrepreneur plan.
          </p>
        )}
      </div>
    </div>
  );
}
