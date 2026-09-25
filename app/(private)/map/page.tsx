import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { MapExplorer } from "@/components/map-explorer";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";
import { groupMemoryPlaces } from "@/lib/map/places";
import { isUuid } from "@/lib/memories/validation";

export const metadata: Metadata = { title: "Bản đồ ký ức" };
export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ memory?: string }> }) {
  const { memory } = await searchParams;
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const places = groupMemoryPlaces(await getVisibleMemories(viewer.supabase, viewer.spaceId));
  const pinnedCount = places.filter((place) => place.latitude !== null).length;
  return <div className="section-page map-page">
    <header className="page-heading map-page-heading"><div><p className="eyebrow">DẤU CHÂN CỦA MÌNH</p><h1>Bản đồ ký ức</h1><p className="page-intro">Mỗi chiếc ghim mở ra những bức ảnh của nơi mình từng đến. Các lần quay lại cùng một nơi nằm chung một trang.</p></div><Link className="button button-primary" href="/memories/new"><Plus size={18} /> Thêm kỷ niệm</Link></header>
    {places.length ? <><div className="map-stats"><span><strong>{places.length}</strong> nơi đã lưu</span><span><strong>{pinnedCount}</strong> ghim trên bản đồ</span><span><strong>{places.reduce((count, place) => count + place.visits.length, 0)}</strong> lần ghé thăm</span></div><MapExplorer key={isUuid(memory) ? memory : "all"} places={places} focusMemoryId={isUuid(memory) ? memory : undefined} /></> : <EmptyPanel icon={<MapPinned size={35} strokeWidth={1.5} />} title="Bản đồ đang chờ chiếc ghim đầu tiên" description="Đăng một kỷ niệm có địa điểm để ảnh của ngày ấy xuất hiện ở đây."><Link className="button button-primary" href="/memories/new"><Plus size={18} /> Thêm kỷ niệm</Link></EmptyPanel>}
  </div>;
}
