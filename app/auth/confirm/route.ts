import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/request";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const next = safeNext(params.get("next"));
  if (!hasSupabaseConfig() || !tokenHash || params.get("type") !== "email") {
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  const response = NextResponse.redirect(new URL(error ? "/login?error=confirmation" : next, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
