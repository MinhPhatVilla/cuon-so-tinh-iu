import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer, getMemoryOwnedBy } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  if (!await getMemoryOwnedBy(viewer.supabase, id, viewer.id)) return NextResponse.json({ error: "Bạn không thể sắp xếp ảnh này." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Thứ tự ảnh không hợp lệ." }, { status: 400 }); }
  const photoIds = (body as { photoIds?: unknown })?.photoIds;
  if (!Array.isArray(photoIds) || photoIds.length < 1 || photoIds.length > 8 || !photoIds.every(isUuid)) {
    return NextResponse.json({ error: "Thứ tự ảnh không hợp lệ." }, { status: 400 });
  }
  const { error } = await viewer.supabase.rpc("reorder_memory_photos", { p_memory_id: id, p_photo_ids: photoIds });
  if (error) return NextResponse.json({ error: "Chưa lưu được thứ tự ảnh." }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
