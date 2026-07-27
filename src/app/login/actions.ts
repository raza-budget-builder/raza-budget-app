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

export async function loginWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Points at the OAuth code-exchange route — see
      // src/app/auth/callback/route.ts. Different flow than email
      // confirmation's token_hash (see auth/confirm/route.ts): this one
      // exchanges an authorization `code` via exchangeCodeForSession.
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // signInWithOAuth doesn't sign anyone in itself — it just returns
  // Google's consent-screen URL. The redirect there (and back to our
  // callback route afterward) is what actually completes the sign-in.
  if (data.url) {
    redirect(data.url);
  }
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
      // confirmation email — see src/app/auth/confirm/route.ts. `next`
      // sends them to the login page with a success banner (not straight
      // to the dashboard) so confirming reads as "now log in", not an
      // automatic sign-in. This only takes effect if the Supabase
      // project's "Confirm signup" email template actually links here
      // (token_hash/type/next) rather than its own default template.
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/login?confirmed=1")}`,
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
