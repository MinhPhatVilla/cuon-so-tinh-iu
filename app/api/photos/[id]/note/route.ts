import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ảnh không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const note = typeof body === "object" && body !== null && "note" in body && typeof body.note === "string" ? body.note.trim() : null;
  if (note === null || note.length > 500) return NextResponse.json({ error: "Lời nhắn tối đa 500 ký tự." }, { status: 400 });
  const { error } = await viewer.supabase.rpc("update_photo_secret_note", { p_photo_id: id, p_note: note });
  if (error) return NextResponse.json({ error: "Chỉ người đăng ảnh mới có thể sửa lời nhắn này." }, { status: 403 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
