import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getVerifiedViewer } from "@/lib/supabase/access";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 });
  const viewer = await getVerifiedViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  const { error } = await viewer.supabase.rpc("create_couple_space");
  const response = NextResponse.redirect(new URL(error ? "/welcome?error=create" : "/", request.url), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
