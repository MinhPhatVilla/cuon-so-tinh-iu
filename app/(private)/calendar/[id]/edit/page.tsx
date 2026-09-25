import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CalendarEventEditor } from "@/components/calendar-event-editor";
import { getMemoryViewer } from "@/lib/memories/server";
import { getCalendarEvents } from "@/lib/calendar/queries";
import { isUuid } from "@/lib/memories/validation";

export const metadata: Metadata = { title: "Sửa sự kiện" };
export const dynamic = "force-dynamic";

export default async function EditCalendarEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getMemoryViewer();
  if (!viewer) notFound();
  const events = await getCalendarEvents(viewer.supabase, viewer.spaceId);
  const event = events.find((item) => item.id === id && item.authorId === viewer.id);
  if (!event) notFound();
  return <div className="section-page calendar-edit-page">
    <Link className="text-link back-link" href={`/calendar?month=${event.date.slice(0, 7)}&day=${event.date}`}><ArrowLeft size={17} /> Lịch</Link>
    <header className="page-heading"><p className="eyebrow">LỊCH CỦA HAI ĐỨA</p><h1>Sửa sự kiện</h1><p className="page-intro">Chỉnh ngày, lời nhắn và cách lời nhắc xuất hiện trên Trang chính.</p></header>
    <CalendarEventEditor initial={event} defaultDate={event.date} />
  </div>;
}
