import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer, cleanPendingPhotos } from "@/lib/memories/server";
import { parseMemoryInput } from "@/lib/memories/validation";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập vào cuốn sổ." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const input = parseMemoryInput(body);
  if (!input) return NextResponse.json({ error: "Hãy kiểm tra ngày, tiêu đề và vị trí." }, { status: 400 });
  const { data: id, error } = await viewer.supabase.rpc("create_memory_draft", {
    p_title: input.title,
    p_story: input.story,
    p_date: input.date,
    p_place_name: input.placeName,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
  if (error || typeof id !== "string") return NextResponse.json({ error: "Chưa tạo được bản nháp. Hãy thử lại." }, { status: 500 });
  await cleanPendingPhotos(viewer.supabase);
  return NextResponse.json({ id }, { headers: { "Cache-Control": "private, no-store" } });
}
