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
  if (!await getMemoryOwnedBy(viewer.supabase, id, viewer.id)) return NextResponse.json({ error: "Bạn không thể đăng kỷ niệm này." }, { status: 403 });
  const { error } = await viewer.supabase.rpc("publish_memory", { p_memory_id: id });
  if (error) return NextResponse.json({ error: "Cần ít nhất một ảnh đã tải lên để đăng kỷ niệm." }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
