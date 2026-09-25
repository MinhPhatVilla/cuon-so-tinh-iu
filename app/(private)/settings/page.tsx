import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, LockKeyhole, LogOut, Sparkles } from "lucide-react";
import { getVerifiedViewer } from "@/lib/supabase/access";
import { getEffectPreferences } from "@/lib/effects/preferences";
import { EffectSettings } from "@/components/effect-settings";

export const metadata: Metadata = { title: "Cài đặt" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getVerifiedViewer();
  if (!viewer) return null;
  const [{ data: members, error }, effectPreferences] = await Promise.all([
    viewer.supabase.from("couple_members").select("user_id, role"),
    getEffectPreferences(viewer.supabase, viewer.id),
  ]);
  if (error || !members) throw new Error("Không thể đọc thành viên cuốn sổ. Vui lòng thử lại.");
  const isOwner = members.some((member) => member.user_id === viewer.id && member.role === "owner");
  const hasPartner = members.some((member) => member.role === "partner");

  return (
    <div className="section-page settings-page">
      <header className="page-heading">
        <p className="eyebrow">KHÔNG GIAN CỦA HAI ĐỨA</p>
        <h1>Cài đặt cuốn sổ</h1>
        <p className="page-intro">Quản lý thành viên, hiệu ứng và tài khoản trong góc riêng của hai bạn.</p>
      </header>
      <div className="settings-grid">
        <article className="paper-card setting-card"><span className="note-symbol note-symbol-pink"><HeartHandshake size={23} /></span><h2>Hai thành viên</h2><p>{hasPartner ? "Cuốn sổ đã có đủ hai thành viên." : isOwner ? "Bạn đã tạo cuốn sổ. Hãy mời người yêu cùng tham gia." : "Bạn đã tham gia cuốn sổ cùng người yêu."}</p>{isOwner && !hasPartner && <Link className="text-link" href="/invite">Tạo lời mời</Link>}</article>
        <article className="paper-card setting-card"><span className="note-symbol note-symbol-lavender"><LockKeyhole size={23} /></span><h2>Quyền riêng tư</h2><p>Trang kỷ niệm chỉ mở cho thành viên đã đăng nhập. Ảnh được đặt trong kho riêng với quyền xem theo cuốn sổ.</p></article>
        <article className="paper-card setting-card"><span className="note-symbol note-symbol-sage"><Sparkles size={23} /></span><h2>Hiệu ứng</h2><p>1.000 tổ hợp khung cảnh, cách ảnh xuất hiện và trang trí. Bạn có thể chọn mức chuyển động và giữ những kiểu yêu thích ở ngay bên dưới.</p></article>
      </div>
      <EffectSettings initial={effectPreferences} />
      <section className="paper-card account-card">
        <div><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h2>{viewer.email}</h2><p>Vai trò: {isOwner ? "Người tạo cuốn sổ" : "Người được mời"}</p></div>
        <form action="/auth/logout" method="post"><button className="button button-soft" type="submit"><LogOut size={17} /> Đăng xuất</button></form>
      </section>
    </div>
  );
}
