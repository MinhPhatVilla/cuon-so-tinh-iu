import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ImageIcon, Pencil, Plus, Repeat2 } from "lucide-react";
import { DeleteCalendarEventButton } from "@/components/delete-calendar-event-button";
import { getMemoryViewer } from "@/lib/memories/server";
import { getCalendarEvents, getMonthMemories } from "@/lib/calendar/queries";
import { formatDateVi, isDateKey, isMonthKey, monthGrid, occurrenceInMonth, shiftMonth, todayInVietnam, type EventOccurrence } from "@/lib/calendar/date";

export const metadata: Metadata = { title: "Lịch của hai đứa" };
export const dynamic = "force-dynamic";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const kindNames = { anniversary: "Ngày kỷ niệm", plan: "Kế hoạch", reminder: "Lời nhắc" } as const;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  const query = await searchParams;
  const today = todayInVietnam();
  const month = isMonthKey(query.month) ? query.month : today.slice(0, 7);
  const selected = isDateKey(query.day) && query.day.slice(0, 7) === month ? query.day : month === today.slice(0, 7) ? today : `${month}-01`;
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const [events, memories] = await Promise.all([
    getCalendarEvents(viewer.supabase, viewer.spaceId), getMonthMemories(viewer.supabase, viewer.spaceId, month),
  ]);
  const eventDays = new Map<string, EventOccurrence[]>();
  for (const event of events) {
    const date = occurrenceInMonth(event, month);
    if (date) eventDays.set(date, [...(eventDays.get(date) ?? []), { event, date, daysUntil: 0 }]);
  }
  const memoryDays = new Map<string, typeof memories>();
  for (const memory of memories) memoryDays.set(memory.date, [...(memoryDays.get(memory.date) ?? []), memory]);
  const selectedEvents = (eventDays.get(selected) ?? []).sort((a, b) => (a.event.time ?? "").localeCompare(b.event.time ?? ""));
  const selectedMemories = memoryDays.get(selected) ?? [];
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return <div className="section-page calendar-page">
    <header className="page-heading calendar-heading">
      <div><p className="eyebrow">NGÀY THÁNG CỦA HAI ĐỨA</p><h1>Lịch của hai đứa</h1><p className="page-intro">Ngày có ảnh tự hiện trên lịch. Hai bạn cũng có thể thêm kỷ niệm, cuộc hẹn và lời nhắc riêng.</p></div>
      <Link className="button button-primary" href={`/calendar/new?date=${selected}`}><Plus size={18} /> Thêm sự kiện</Link>
    </header>
    <div className="calendar-layout">
      <section className="paper-card calendar-board" aria-label={`Lịch tháng ${Number(month.slice(5))} năm ${month.slice(0, 4)}`}>
        <div className="calendar-toolbar">
          <div><p className="eyebrow">MÌNH ĐÃ CÙNG NHAU</p><h2>Tháng {Number(month.slice(5))} / {month.slice(0, 4)}</h2></div>
          <nav className="calendar-nav" aria-label="Chuyển tháng">
            {isMonthKey(previous) ? <Link href={`/calendar?month=${previous}`} aria-label="Tháng trước"><ChevronLeft size={20} /></Link> : <span aria-hidden="true" />}
            <Link className="calendar-today" href={`/calendar?month=${today.slice(0, 7)}&day=${today}`}>Hôm nay</Link>
            {isMonthKey(next) ? <Link href={`/calendar?month=${next}`} aria-label="Tháng sau"><ChevronRight size={20} /></Link> : <span aria-hidden="true" />}
          </nav>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {monthGrid(month).map((day) => {
            const eventCount = eventDays.get(day)?.length ?? 0;
            const memoryCount = memoryDays.get(day)?.length ?? 0;
            const outside = day.slice(0, 7) !== month;
            const content = <><span className="calendar-day-number">{Number(day.slice(8))}</span><span className="calendar-day-marks" aria-hidden="true">{memoryCount > 0 && <i className="calendar-photo-dot" />}{eventCount > 0 && <i className="calendar-event-dot" />}</span><small>{!outside && memoryCount + eventCount > 0 ? `${memoryCount + eventCount} mục` : "\u00a0"}</small></>;
            const className = `calendar-day${outside ? " calendar-day-outside" : ""}${day === selected ? " calendar-day-selected" : ""}${day === today ? " calendar-day-today" : ""}`;
            return isMonthKey(day.slice(0, 7)) ? <Link key={day} className={className} href={`/calendar?month=${day.slice(0, 7)}&day=${day}`} aria-label={`${formatDateVi(day)}${memoryCount + eventCount ? `, ${memoryCount} kỷ niệm ảnh, ${eventCount} sự kiện` : ""}`} aria-current={day === selected ? "date" : undefined}>{content}</Link> : <span key={day} className={className} aria-hidden="true">{content}</span>;
          })}
        </div>
        <p className="calendar-legend"><span><i className="calendar-photo-dot" /> Ảnh kỷ niệm</span><span><i className="calendar-event-dot" /> Sự kiện</span></p>
      </section>
      <section className="calendar-day-panel" aria-labelledby="selected-day-heading">
        <div className="calendar-day-heading"><div><p className="eyebrow">NGÀY ĐÃ CHỌN</p><h2 id="selected-day-heading">{formatDateVi(selected)}</h2></div><Link className="calendar-add-link" href={`/calendar/new?date=${selected}`} aria-label="Thêm sự kiện vào ngày này"><Plus size={18} /></Link></div>
        {selectedMemories.length + selectedEvents.length === 0 ? <div className="paper-card calendar-empty"><CalendarDays size={29} strokeWidth={1.5} /><h3>Ngày này còn để trống</h3><p>Thêm một sự kiện, hoặc đăng ảnh kỷ niệm đúng ngày này để lấp đầy trang sổ.</p><Link className="text-link" href={`/calendar/new?date=${selected}`}>Đánh dấu ngày này <Plus size={16} /></Link></div> : <div className="calendar-day-list">
          {selectedMemories.map((memory) => <Link className="paper-card calendar-memory-card" href={`/memories/${memory.id}`} key={memory.id}>
            <span className="calendar-memory-cover">{memory.coverId ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${memory.coverId}`} alt="" />
            </> : <ImageIcon size={24} />}</span>
            <span><small>ẢNH KỶ NIỆM</small><strong>{memory.title}</strong><em>Mở trang ảnh →</em></span>
          </Link>)}
          {selectedEvents.map(({ event }) => <article className={`paper-card calendar-event-card calendar-event-${event.kind}`} key={event.id}>
            <div className="calendar-event-top"><span className="calendar-event-kind">{kindNames[event.kind]}</span>{event.recurrence === "yearly" && <span className="calendar-event-repeat"><Repeat2 size={14} /> Hằng năm</span>}</div>
            <h3>{event.title}</h3>{event.time && <p className="calendar-event-time">Lúc {event.time}</p>}{event.note && <p className="calendar-event-note">{event.note}</p>}
            {event.authorId === viewer.id && <div className="calendar-event-actions"><Link className="calendar-icon-button" href={`/calendar/${event.id}/edit`} aria-label={`Sửa ${event.title}`} title="Sửa sự kiện"><Pencil size={16} /></Link><DeleteCalendarEventButton id={event.id} /></div>}
          </article>)}
        </div>}
      </section>
    </div>
  </div>;
}
