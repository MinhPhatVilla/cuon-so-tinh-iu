import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost, normalizedEmail, safeNext } from "@/lib/auth/request";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function go(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!hasSupabaseConfig()) return go(request, "/login?setup=1");

  const form = await request.formData();
  const email = normalizedEmail(form.get("email"));
  const password = form.get("password");
  const mode = form.get("mode") === "signup" ? "signup" : "login";
  const next = safeNext(typeof form.get("next") === "string" ? String(form.get("next")) : null);
  if (!email || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return go(request, `/login?mode=${mode}&error=invalid&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: new URL("/auth/confirm", request.url).toString() },
    });
    if (error) return go(request, "/login?mode=signup&error=signup");
    if (data.session) return go(request, next);
    return go(request, "/login?notice=check-email");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return go(request, `/login?error=credentials&next=${encodeURIComponent(next)}`);
  return go(request, next);
}
