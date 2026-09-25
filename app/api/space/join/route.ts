import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getVerifiedViewer } from "@/lib/supabase/access";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getVerifiedViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const token = (body as { token?: unknown })?.token;
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: "Lời mời không hợp lệ." }, { status: 400 });
  }

  const { error } = await viewer.supabase.rpc("accept_couple_invite", { p_token: token });
  if (error) return NextResponse.json({ error: "Lời mời đã hết hạn, đã dùng hoặc không dành cho email này." }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
