import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MemoryEditor } from "@/components/memory-editor";

export const metadata: Metadata = { title: "Thêm kỷ niệm" };

export default function NewMemoryPage() {
  return <div className="section-page memory-page">
    <Link className="text-link back-link" href="/album"><ArrowLeft size={17} /> Album</Link>
    <header className="page-heading"><p className="eyebrow">TRANG MỚI CỦA HAI ĐỨA</p><h1>Thêm kỷ niệm</h1><p className="page-intro">Chọn những bức ảnh, ghi lại ngày ấy và một nơi hai bạn đã đi qua.</p></header>
    <MemoryEditor searchEnabled={Boolean(process.env.GEOAPIFY_API_KEY?.trim())} />
  </div>;
}
