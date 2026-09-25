import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";
import { parseEventInput } from "@/lib/calendar/validation";

type Context = { params: Promise<{ id: string }> };

async function ownedEvent(id: string, spaceId: string, userId: string, viewer: NonNullable<Awaited<ReturnType<typeof getMemoryViewer>>>) {
  const { data, error } = await viewer.supabase.from("calendar_events")
    .select("id").eq("id", id).eq("space_id", spaceId).eq("author_id", userId).maybeSingle();
  return !error && !!data;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Sự kiện không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const input = parseEventInput(body);
  if (!input) return NextResponse.json({ error: "Hãy kiểm tra ngày, giờ và nội dung sự kiện." }, { status: 400 });
  if (!await ownedEvent(id, viewer.spaceId, viewer.id, viewer)) return NextResponse.json({ error: "Bạn không thể sửa sự kiện này." }, { status: 403 });
  const { error } = await viewer.supabase.rpc("update_calendar_event", {
    p_event_id: id, p_date: input.date, p_time: input.time, p_title: input.title, p_note: input.note,
    p_kind: input.kind, p_recurrence: input.recurrence, p_remind_days_before: input.remindDaysBefore,
  });
  if (error) return NextResponse.json({ error: "Chưa lưu được thay đổi. Hãy thử lại." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Sự kiện không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  if (!await ownedEvent(id, viewer.spaceId, viewer.id, viewer)) return NextResponse.json({ error: "Bạn không thể xóa sự kiện này." }, { status: 403 });
  const { error } = await viewer.supabase.rpc("delete_calendar_event", { p_event_id: id });
  if (error) return NextResponse.json({ error: "Chưa xóa được sự kiện. Hãy thử lại." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
