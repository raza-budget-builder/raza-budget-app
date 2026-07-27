"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Points at the route handler that verifies the token from the
      // confirmation email — see src/app/auth/confirm/route.ts. This only
      // takes effect if the Supabase project's "Confirm signup" email
      // template actually links here (token_hash/type/next) rather than
      // its own default template.
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // No session means this Supabase project has email confirmation turned
  // on: the account was created but isn't usable until the user clicks the
  // link just emailed to them. Show that instead of sending them to a
  // dashboard they can't actually reach yet.
  if (!data.session) {
    redirect("/login?checkEmail=1");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
