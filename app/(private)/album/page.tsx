import type { Metadata } from "next";
import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";

export const metadata: Metadata = { title: "Album" };
export const dynamic = "force-dynamic";

export default async function AlbumPage() {
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const memories = await getVisibleMemories(viewer.supabase, viewer.spaceId);
  return (
    <div className="section-page album-page">
      <header className="page-heading album-heading">
        <div>
        <p className="eyebrow">NHỮNG BỨC ẢNH CỦA MÌNH</p>
        <h1>Album kỷ niệm</h1>
        <p className="page-intro">Mỗi trang là một ngày hai đứa muốn giữ lại.</p>
        </div>
        <Link className="button button-primary" href="/memories/new"><Plus size={18} /> Thêm kỷ niệm</Link>
      </header>
      {memories.length === 0 ? <EmptyPanel icon={<Images size={35} strokeWidth={1.5} />} title="Album vẫn còn trang trắng" description="Chọn một bức ảnh và viết lại ngày đầu tiên bạn muốn giữ."><Link className="button button-primary" href="/memories/new"><Plus size={18} /> Thêm kỷ niệm</Link></EmptyPanel> :
        <div className="album-grid">{memories.map((memory) => <Link className="paper-card album-card" href={memory.status === "draft" ? `/memories/${memory.id}/edit` : `/memories/${memory.id}`} key={memory.id}>
          <div className="album-cover">{memory.photos[0] ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${memory.photos[0].id}`} alt={`Ảnh bìa của ${memory.title}`} loading="lazy" />
          </> : <Images size={38} strokeWidth={1.3} />}</div>
          <div className="album-card-copy"><span className="album-date">{memory.date.split("-").reverse().join("/")}</span>{memory.status === "draft" && <span className="draft-badge">Bản nháp</span>}<h2>{memory.title}</h2><p>{memory.place?.name ?? (memory.story || "Mở trang để xem kỷ niệm")}</p></div>
        </Link>)}</div>}
    </div>
  );
}
