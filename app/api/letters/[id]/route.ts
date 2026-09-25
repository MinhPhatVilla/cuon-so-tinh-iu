import { NextResponse, type NextRequest } from "next/server";
import { getMemoryViewer } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Lá thư không hợp lệ." }, { status: 404 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const { data, error } = await viewer.supabase.rpc("read_future_letter", { p_letter_id: id });
  if (error) return NextResponse.json({ error: "Chưa đọc được thư. Hãy thử lại." }, { status: 500 });
  const content = Array.isArray(data) ? data[0] : null;
  if (!content) return NextResponse.json({ error: "Thư chưa đến ngày mở hoặc không thuộc cuốn sổ này." }, { status: 404 });
  return NextResponse.json({ title: content.title, body: content.body, hasPhoto: Boolean(content.photo_path) }, { headers: { "Cache-Control": "private, no-store" } });
}
