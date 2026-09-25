import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { isEffectCode } from "@/lib/effects/catalog";

export async function PATCH(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const data = input as Record<string, unknown>;
  if (data.action === "motion" && (data.mode === "system" || data.mode === "full" || data.mode === "reduced")) {
    const { data: mode, error } = await viewer.supabase.rpc("set_effect_motion", { p_mode: data.mode });
    return error ? NextResponse.json({ error: "Chưa lưu được chế độ chuyển động." }, { status: 500 })
      : NextResponse.json({ mode }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (data.action === "favorite" && isEffectCode(data.code)) {
    const { data: codes, error } = await viewer.supabase.rpc("toggle_effect_favorite", { p_code: data.code });
    return error ? NextResponse.json({ error: "Chưa lưu được hiệu ứng yêu thích. Tối đa 50 kiểu." }, { status: 400 })
      : NextResponse.json({ codes }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (data.action === "record" && isEffectCode(data.code)) {
    const { data: recent, error } = await viewer.supabase.rpc("record_effect", { p_code: data.code });
    return error ? NextResponse.json({ error: "Chưa lưu được lịch sử hiệu ứng." }, { status: 500 })
      : NextResponse.json({ recent }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ error: "Thiết lập không hợp lệ." }, { status: 400 });
}
