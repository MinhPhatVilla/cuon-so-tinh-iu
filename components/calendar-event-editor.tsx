"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CalendarPlus, Save } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar/date";

export function CalendarEventEditor({ initial, defaultDate }: { initial?: CalendarEvent; defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [kind, setKind] = useState<CalendarEvent["kind"]>(initial?.kind ?? "plan");
  const [recurrence, setRecurrence] = useState<CalendarEvent["recurrence"]>(initial?.recurrence ?? "none");
  const [remindDaysBefore, setRemindDaysBefore] = useState(initial?.remindDaysBefore ?? 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(initial ? `/api/calendar/events/${initial.id}` : "/api/calendar/events", {
        method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time: time || null, title, note, kind, recurrence, remindDaysBefore }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa lưu được sự kiện.");
      router.replace(`/calendar?month=${date.slice(0, 7)}&day=${date}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa lưu được sự kiện.");
      setBusy(false);
    }
  }

  return <form className="paper-card calendar-editor" onSubmit={save}>
    <p className="eyebrow">MỘT NGÀY ĐỂ MONG CHỜ</p>
    <h2>{initial ? "Chỉnh lại sự kiện" : "Đánh dấu một ngày"}</h2>
    <p className="editor-help">Cả hai đều thấy sự kiện trong lịch chung. Người tạo có thể sửa và xóa.</p>
    <div className="memory-fields">
      <label htmlFor="event-title">Tên sự kiện</label>
      <input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required disabled={busy} placeholder="Ví dụ: Kỷ niệm lần đầu gặp nhau" />
      <label htmlFor="event-kind">Loại ngày</label>
      <select id="event-kind" value={kind} onChange={(event) => setKind(event.target.value as CalendarEvent["kind"])} disabled={busy}>
        <option value="anniversary">Ngày kỷ niệm</option><option value="plan">Kế hoạch</option><option value="reminder">Lời nhắc</option>
      </select>
      <div className="calendar-form-pair">
        <div><label htmlFor="event-date">Ngày</label><input id="event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} min="1900-01-01" max="2100-12-31" required disabled={busy} /></div>
        <div><label htmlFor="event-time">Giờ <span>(nếu có)</span></label><input id="event-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={busy} /></div>
      </div>
      <label htmlFor="event-note">Lời ghi chú <span>(nếu có)</span></label>
      <textarea id="event-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={4} disabled={busy} placeholder="Mình sẽ làm gì cùng nhau hôm đó?" />
      <div className="calendar-form-pair">
        <div><label htmlFor="event-repeat">Lặp lại</label><select id="event-repeat" value={recurrence} onChange={(event) => setRecurrence(event.target.value as CalendarEvent["recurrence"])} disabled={busy}><option value="none">Không lặp</option><option value="yearly">Hằng năm</option></select></div>
        <div><label htmlFor="event-remind">Nhắc trước</label><select id="event-remind" value={remindDaysBefore} onChange={(event) => setRemindDaysBefore(Number(event.target.value))} disabled={busy}>{[0, 1, 3, 7, 14, 30].map((days) => <option value={days} key={days}>{days === 0 ? "Đúng ngày" : `${days} ngày`}</option>)}</select></div>
      </div>
    </div>
    <p className="calendar-form-help">Lời nhắc hiện trên Trang chính trong khoảng ngày bạn chọn; chưa gửi thông báo ra thiết bị. Ngày 29/2 lặp lại chỉ xuất hiện vào năm nhuận.</p>
    {message && <p className="memory-message" role="alert">{message}</p>}
    <div className="calendar-form-actions"><Link className="text-link" href={`/calendar?month=${date.slice(0, 7)}&day=${date}`}>Quay lại lịch</Link><button className="button button-primary" type="submit" disabled={busy}>{initial ? <Save size={17} /> : <CalendarPlus size={17} />}{busy ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Thêm vào lịch"}</button></div>
  </form>;
}
