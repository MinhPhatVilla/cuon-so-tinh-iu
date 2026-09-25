import type { Metadata } from "next";
import Link from "next/link";
import { BookHeart, HeartHandshake } from "lucide-react";
import { getVerifiedViewer } from "@/lib/supabase/access";
import { JoinInvitation } from "@/components/join-invitation";

export const metadata: Metadata = { title: "Nhận lời mời" };
export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const viewer = await getVerifiedViewer();
  return (
    <main id="noi-dung" className="choice-page">
      <div className="join-wrap paper-card">
        <Link className="brand" href="/login"><span className="brand-mark"><BookHeart size={22} /></span><span>Cuốn Sổ tình iu</span></Link>
        <span className="note-symbol note-symbol-lavender"><HeartHandshake size={27} /></span>
        <p className="eyebrow">LỜI MỜI DÀNH CHO BẠN</p>
        <h1>Cùng mở cuốn sổ của hai đứa</h1>
        <p>Đăng nhập bằng đúng email được mời. Sau đó bạn có thể nhận lời mời và xem kỷ niệm chung.</p>
        <JoinInvitation authenticated={Boolean(viewer)} />
        {viewer && <Link className="text-link" href="/welcome">Quay lại lựa chọn</Link>}
      </div>
    </main>
  );
}
