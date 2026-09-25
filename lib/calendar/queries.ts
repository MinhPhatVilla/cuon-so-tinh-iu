import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "./date";

export type CalendarMemory = { id: string; title: string; date: string; coverId: string | null };

export async function getCalendarEvents(supabase: SupabaseClient, spaceId: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  for (let from = 0; ; from += 200) {
    const { data, error } = await supabase.from("calendar_events")
      .select("id,author_id,event_date,event_time,title,note,kind,recurrence,remind_days_before")
      .eq("space_id", spaceId).order("event_date").order("id").range(from, from + 199);
    if (error) throw new Error("Không thể tải lịch chung. Vui lòng thử lại.");
    for (const row of data ?? []) events.push({
      id: row.id, authorId: row.author_id, date: row.event_date,
      time: row.event_time?.slice(0, 5) ?? null, title: row.title, note: row.note,
      kind: row.kind, recurrence: row.recurrence, remindDaysBefore: row.remind_days_before,
    });
    if (!data || data.length < 200) break;
  }
  return events;
}

export async function getMonthMemories(supabase: SupabaseClient, spaceId: string, month: string): Promise<CalendarMemory[]> {
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const memories: CalendarMemory[] = [];
  for (let from = 0; ; from += 200) {
    const { data, error } = await supabase.from("memories")
      .select("id,title,memory_date").eq("space_id", spaceId).eq("status", "published")
      .gte("memory_date", `${month}-01`).lte("memory_date", `${month}-${String(last).padStart(2, "0")}`)
      .order("memory_date").order("id").range(from, from + 199);
    if (error) throw new Error("Không thể tải ảnh theo ngày. Vui lòng thử lại.");
    memories.push(...(data ?? []).map((row) => ({ id: row.id, title: row.title, date: row.memory_date, coverId: null })));
    if (!data || data.length < 200) break;
  }
  for (let from = 0; from < memories.length; from += 100) {
    const group = memories.slice(from, from + 100);
    const { data: photos, error } = await supabase.from("photos")
      .select("id,memory_id,sort_order").in("memory_id", group.map((memory) => memory.id))
      .order("sort_order").order("id");
    if (error) throw new Error("Không thể tải ảnh theo ngày. Vui lòng thử lại.");
    const cover = new Map<string, string>();
    for (const photo of photos ?? []) if (!cover.has(photo.memory_id)) cover.set(photo.memory_id, photo.id);
    for (const memory of group) memory.coverId = cover.get(memory.id) ?? null;
  }
  return memories;
}
