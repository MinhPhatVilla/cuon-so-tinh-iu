import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { parseEventInput } from "@/lib/calendar/validation";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập vào cuốn sổ." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const input = parseEventInput(body);
  if (!input) return NextResponse.json({ error: "Hãy kiểm tra ngày, giờ và nội dung sự kiện." }, { status: 400 });
  const { data: id, error } = await viewer.supabase.rpc("create_calendar_event", {
    p_date: input.date, p_time: input.time, p_title: input.title, p_note: input.note,
    p_kind: input.kind, p_recurrence: input.recurrence, p_remind_days_before: input.remindDaysBefore,
  });
  if (error || typeof id !== "string") return NextResponse.json({ error: "Chưa thêm được sự kiện. Hãy thử lại." }, { status: 500 });
  return NextResponse.json({ id }, { headers: { "Cache-Control": "private, no-store" } });
}
