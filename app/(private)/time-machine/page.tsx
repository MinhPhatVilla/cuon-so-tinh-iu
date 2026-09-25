import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Images, MapPin } from "lucide-react";
import { RandomDayButton } from "@/components/random-day-button";
import { EffectGallery } from "@/components/effect-gallery";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";
import { formatDateVi, isDateKey } from "@/lib/calendar/date";
import { getEffectPreferences } from "@/lib/effects/preferences";

export const metadata: Metadata = { title: "Cỗ máy một ngày bất kỳ" };
export const dynamic = "force-dynamic";

export default async function TimeMachinePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  if (day && !isDateKey(day)) notFound();
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const [visibleMemories, effectPreferences] = await Promise.all([
    getVisibleMemories(viewer.supabase, viewer.spaceId), getEffectPreferences(viewer.supabase, viewer.id),
  ]);
  const memories = visibleMemories.filter((memory) => memory.status === "published");
  const days = [...new Set(memories.map((memory) => memory.date))];
  const selected = day ? memories.filter((memory) => memory.date === day) : [];

  return <div className="section-page journey-page">
    <Link className="text-link back-link" href="/"><ArrowLeft size={17} /> Trang chính</Link>
    <header className="page-heading journey-heading"><p className="eyebrow">CỖ MÁY MỘT NGÀY BẤT KỲ</p><h1>{selected.length && day ? formatDateVi(day) : "Mình quay về ngày nào?"}</h1><p className="page-intro">Một ngày đã lưu sẽ hiện lại qua những bức ảnh và câu chuyện của hai bạn.</p><div className="journey-actions"><RandomDayButton days={days} currentDay={day} label={selected.length ? "Thử một ngày khác" : "Chọn một ngày"} />{selected.length > 0 && day && <Link className="button button-outline" href={`/calendar?month=${day.slice(0, 7)}&day=${day}`}><CalendarDays size={17} /> Xem trên lịch</Link>}</div></header>
    {selected.length === 0 ? <div className="paper-card journey-empty"><Images size={32} strokeWidth={1.5} /><h2>{memories.length ? "Ngày này chưa có ảnh" : "Cuốn sổ đang chờ ảnh đầu tiên"}</h2><p>{memories.length ? "Kỷ niệm của ngày này có thể đã được xóa. Hãy để cỗ máy chọn một ngày khác." : "Hãy đăng một kỷ niệm có ảnh để bắt đầu chuyến quay về."}</p>{!memories.length && <Link className="button button-primary" href="/memories/new">Thêm kỷ niệm</Link>}</div> : <div className="journey-stack">{selected.map((memory, memoryIndex) => <section className="journey-memory" key={memory.id} aria-labelledby={`journey-${memory.id}`}>
      <div className="journey-memory-heading"><div><p className="eyebrow">MẢNH GHÉP {String(memoryIndex + 1).padStart(2, "0")}</p><h2 id={`journey-${memory.id}`}>{memory.title}</h2></div><Link className="text-link" href={`/memories/${memory.id}`}>Mở trang kỷ niệm →</Link></div>
      <EffectGallery mode="journey" photos={memory.photos.map((photo) => ({ id: photo.id }))} title={memory.title} memoryId={memory.id} userId={viewer.id} preferences={effectPreferences} eagerFirst={memoryIndex === 0} />
      {memory.story && <p className="journey-story">“{memory.story}”</p>}
      {memory.place && <Link className="journey-place" href={`/map?memory=${memory.id}`}><MapPin size={17} /> {memory.place.name} <span>· Xem nơi này</span></Link>}
    </section>)}</div>}
  </div>;
}
