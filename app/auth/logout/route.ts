import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 });
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
