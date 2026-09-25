import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer, cleanPendingPhotos, getMemoryOwnedBy } from "@/lib/memories/server";
import { isUuid, parseMemoryInput } from "@/lib/memories/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const input = parseMemoryInput(body);
  if (!input) return NextResponse.json({ error: "Hãy kiểm tra ngày, tiêu đề và vị trí." }, { status: 400 });
  if (!await getMemoryOwnedBy(viewer.supabase, id, viewer.id)) return NextResponse.json({ error: "Bạn không thể sửa kỷ niệm này." }, { status: 403 });
  const { error } = await viewer.supabase.rpc("update_memory", {
    p_memory_id: id,
    p_title: input.title,
    p_story: input.story,
    p_date: input.date,
    p_place_name: input.placeName,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
  if (error) return NextResponse.json({ error: "Chưa lưu được thay đổi. Hãy thử lại." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  if (!await getMemoryOwnedBy(viewer.supabase, id, viewer.id)) return NextResponse.json({ error: "Bạn không thể xóa kỷ niệm này." }, { status: 403 });
  const { error } = await viewer.supabase.rpc("delete_memory", { p_memory_id: id });
  if (error) return NextResponse.json({ error: "Chưa xóa được kỷ niệm. Hãy thử lại." }, { status: 500 });
  await cleanPendingPhotos(viewer.supabase);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
