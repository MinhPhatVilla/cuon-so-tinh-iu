import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { parseGift } from "@/lib/garden/validation";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let data: unknown;
  try { data = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const gift = parseGift(data);
  if (!gift) return NextResponse.json({ error: "Chọn một món quà và viết lời nhắn từ 1 đến 500 ký tự." }, { status: 400 });
  const { data: id, error } = await viewer.supabase.rpc("send_gift", { p_kind: gift.kind, p_message: gift.message });
  if (error || typeof id !== "string") return NextResponse.json({ error: "Chưa gửi được quà. Kiểm tra người ấy đã vào sổ và thử lại." }, { status: 400 });
  return NextResponse.json({ id }, { headers: { "Cache-Control": "private, no-store" } });
}
