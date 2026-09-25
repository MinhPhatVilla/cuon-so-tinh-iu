import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Pencil } from "lucide-react";
import { DeleteMemoryButton } from "@/components/delete-memory-button";
import { EffectGallery } from "@/components/effect-gallery";
import { PerspectiveEditor } from "@/components/perspective-editor";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";
import { getMemoryExtras } from "@/lib/memories/extras";
import { isUuid } from "@/lib/memories/validation";
import { getEffectPreferences } from "@/lib/effects/preferences";

export const metadata: Metadata = { title: "Kỷ niệm" };
export const dynamic = "force-dynamic";

export default async function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getMemoryViewer();
  if (!viewer) notFound();
  const memories = await getVisibleMemories(viewer.supabase, viewer.spaceId);
  const memory = memories.find((item) => item.id === id);
  if (!memory) notFound();
  const [extras, effectPreferences] = await Promise.all([
    getMemoryExtras(viewer.supabase, id), getEffectPreferences(viewer.supabase, viewer.id),
  ]);
  const own = memory.authorId === viewer.id;
  const partnerStory = extras.perspectives.find((item) => item.authorId !== memory.authorId)?.story ?? "";
  const formatted = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${memory.date}T12:00:00Z`));

  return <article className="section-page memory-detail">
    <Link className="text-link back-link" href="/album"><ArrowLeft size={17} /> Trở lại album</Link>
    <header className="page-heading"><p className="eyebrow">{memory.status === "draft" ? "BẢN NHÁP CHỈ BẠN THẤY" : "MỘT TRANG TRONG CUỐN SỔ"}</p><h1>{memory.title}</h1><div className="memory-meta"><span><CalendarDays size={17} /> {formatted}</span>{memory.place && <Link className="memory-place-link" href={`/map?memory=${id}`}><MapPin size={17} /> {memory.place.name}</Link>}</div></header>
    {memory.photos.length > 0 ? <EffectGallery mode="memory" photos={memory.photos.map((photo) => ({ id: photo.id, note: extras.notes.get(photo.id) ?? "" }))} title={memory.title} memoryId={id} canEdit={own} userId={viewer.id} preferences={effectPreferences} /> : <div className="paper-card no-photos"><p>Trang nháp này chưa có ảnh. Hãy thêm ảnh trước khi đăng cho người yêu cùng xem.</p></div>}
    {memory.status === "published" ? <section className="paper-card perspectives-card" aria-labelledby="perspectives-heading">
      <p className="eyebrow">CÙNG MỘT NGÀY, HAI CÁCH NHỚ</p><h2 id="perspectives-heading">Hai góc nhìn</h2>
      <div className="perspective-entry"><p className="eyebrow">NGƯỜI ĐĂNG KỶ NIỆM</p>{memory.story ? <p className="perspective-text">{memory.story}</p> : <p className="perspective-placeholder">Chưa có lời kể. Người đăng có thể thêm ở mục sửa kỷ niệm.</p>}</div>
      {own ? <div className="perspective-entry perspective-entry-partner"><p className="eyebrow">NGƯỜI YÊU CỦA BẠN</p>{partnerStory ? <p className="perspective-text">{partnerStory}</p> : <p className="perspective-placeholder">Đang chờ người ấy ghi lại điều mình nhớ.</p>}</div> : <PerspectiveEditor memoryId={id} initialStory={partnerStory} />}
    </section> : memory.story && <section className="paper-card memory-story"><p className="eyebrow">LỜI KỂ CỦA NGÀY ẤY</p><p>{memory.story}</p></section>}
    {memory.place?.latitude !== null && memory.place?.longitude !== null && memory.place && <p className="coordinate-note">Ghim đã lưu: {memory.place.latitude.toFixed(5)}, {memory.place.longitude.toFixed(5)}</p>}
    {own && <div className="memory-detail-actions"><Link className="button button-soft" href={`/memories/${id}/edit`}><Pencil size={17} /> {memory.status === "draft" ? "Hoàn tất bản nháp" : "Sửa kỷ niệm"}</Link><DeleteMemoryButton id={id} /></div>}
  </article>;
}
