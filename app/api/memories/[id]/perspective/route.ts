import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const story = typeof body === "object" && body !== null && "story" in body && typeof body.story === "string" ? body.story.trim() : "";
  if (!story || story.length > 3000) return NextResponse.json({ error: "Lời kể cần từ 1 đến 3000 ký tự." }, { status: 400 });
  const { error } = await viewer.supabase.rpc("save_memory_perspective", { p_memory_id: id, p_story: story });
  if (error) return NextResponse.json({ error: "Chưa lưu được góc nhìn. Bạn chỉ có thể viết trong kỷ niệm người yêu đã đăng." }, { status: 403 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const { error } = await viewer.supabase.rpc("delete_memory_perspective", { p_memory_id: id });
  if (error) return NextResponse.json({ error: "Chưa xóa được góc nhìn." }, { status: 403 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
