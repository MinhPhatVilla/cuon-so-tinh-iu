import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarEventEditor } from "@/components/calendar-event-editor";
import { isDateKey, todayInVietnam } from "@/lib/calendar/date";

export const metadata: Metadata = { title: "Thêm vào lịch" };

export default async function NewCalendarEventPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const defaultDate = isDateKey(date) && date >= "1900-01-01" && date <= "2100-12-31" ? date : todayInVietnam();
  return <div className="section-page calendar-edit-page">
    <Link className="text-link back-link" href="/calendar"><ArrowLeft size={17} /> Lịch</Link>
    <header className="page-heading"><p className="eyebrow">LỊCH CỦA HAI ĐỨA</p><h1>Thêm sự kiện</h1><p className="page-intro">Giữ lại ngày kỷ niệm, chuẩn bị cuộc hẹn hoặc nhắc nhau một điều nhỏ.</p></header>
    <CalendarEventEditor defaultDate={defaultDate} />
  </div>;
}
