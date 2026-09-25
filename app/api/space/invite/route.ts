import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost, normalizedEmail } from "@/lib/auth/request";
import { getVerifiedViewer } from "@/lib/supabase/access";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getVerifiedViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const email = normalizedEmail((body as { email?: unknown })?.email);
  if (!email) return NextResponse.json({ error: "Hãy nhập email hợp lệ." }, { status: 400 });

  const { data: membership, error: membershipError } = await viewer.supabase
    .from("couple_members")
    .select("space_id, role")
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (membershipError || !membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Chỉ người tạo cuốn sổ mới có thể mời." }, { status: 403 });
  }

  const { data: token, error } = await viewer.supabase.rpc("create_couple_invite", {
    p_space_id: membership.space_id,
    p_email: email,
  });
  if (error || typeof token !== "string") {
    return NextResponse.json({ error: "Chưa tạo được lời mời. Hãy thử lại." }, { status: 400 });
  }

  return NextResponse.json({ token }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
