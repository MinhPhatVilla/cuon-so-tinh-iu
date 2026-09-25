import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, LockKeyhole } from "lucide-react";
import { InviteCreator } from "@/components/invite-creator";
import { getVerifiedViewer } from "@/lib/supabase/access";

export const metadata: Metadata = { title: "Mời người yêu" };
export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const viewer = await getVerifiedViewer();
  if (!viewer) return null;

  const { data: members, error } = await viewer.supabase
    .from("couple_members")
    .select("user_id, role")
    .order("joined_at", { ascending: true });
  if (error || !members) throw new Error("Không thể đọc danh sách thành viên. Vui lòng thử lại.");
  const isOwner = members.some((member) => member.user_id === viewer.id && member.role === "owner");
  const hasPartner = members.some((member) => member.role === "partner");

  return <div className="section-page invite-page">
    <header className="page-heading">
      <p className="eyebrow">GỬI MỘT CHIẾC CHÌA KHÓA NHỎ</p>
      <h1>Mời người yêu vào cuốn sổ</h1>
      <p className="page-intro">Hai tài khoản riêng, một góc lưu niệm chung. Chỉ email bạn chọn mới nhận được lời mời.</p>
    </header>
    <div className="invite-layout">
      <section className="paper-card invite-main-card">
        <span className="note-symbol note-symbol-pink"><HeartHandshake size={24} /></span>
        {hasPartner ? <><h2>Hai bạn đã ở đây rồi ♡</h2><p>Cuốn sổ đã đủ hai thành viên. Giờ hai bạn có thể cùng lưu kỷ niệm.</p></> :
          isOwner ? <><h2>Mời người thương</h2><p>Nhập đúng email mà người ấy dùng để đăng ký. Bạn sẽ nhận được đường dẫn riêng để tự gửi.</p><InviteCreator /></> :
          <><h2>Lời mời do người tạo gửi</h2><p>Chỉ người tạo cuốn sổ có thể mời thành viên còn lại.</p></>}
      </section>
      <aside className="paper-card invite-help-card">
        <span className="note-symbol note-symbol-lavender"><LockKeyhole size={24} /></span>
        <h2>Một lời mời an toàn</h2>
        <p>Đường dẫn hết hạn sau 48 giờ, dùng một lần và gắn với email được mời. Hãy gửi riêng cho người yêu.</p>
        <Link className="text-link" href="/settings">Xem cài đặt cuốn sổ</Link>
      </aside>
    </div>
  </div>;
}
