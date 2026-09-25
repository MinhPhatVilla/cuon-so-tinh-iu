import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MemoryEditor } from "@/components/memory-editor";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";
import { isUuid } from "@/lib/memories/validation";

export const metadata: Metadata = { title: "Sửa kỷ niệm" };
export const dynamic = "force-dynamic";

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getMemoryViewer();
  if (!viewer) notFound();
  const memories = await getVisibleMemories(viewer.supabase, viewer.spaceId);
  const memory = memories.find((item) => item.id === id && item.authorId === viewer.id);
  if (!memory) notFound();
  return <div className="section-page memory-page">
    <Link className="text-link back-link" href={`/memories/${id}`}><ArrowLeft size={17} /> Kỷ niệm</Link>
    <header className="page-heading"><p className="eyebrow">CHỈNH LẠI TRANG SỔ</p><h1>{memory.status === "draft" ? "Hoàn tất bản nháp" : "Sửa kỷ niệm"}</h1><p className="page-intro">Bạn có thể thay ngày, lời kể, vị trí và ảnh do mình đăng.</p></header>
    <MemoryEditor initial={memory} searchEnabled={Boolean(process.env.GEOAPIFY_API_KEY?.trim())} />
  </div>;
}
