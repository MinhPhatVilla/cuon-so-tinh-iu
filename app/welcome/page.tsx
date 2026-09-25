import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookHeart, HeartHandshake, Plus } from "lucide-react";
import { getVerifiedViewer } from "@/lib/supabase/access";
import { JoinInvitation } from "@/components/join-invitation";

export const metadata: Metadata = { title: "Bắt đầu" };
export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await getVerifiedViewer();
  if (!viewer) redirect("/login");
  const { data: space, error } = await viewer.supabase.from("couple_spaces").select("id").maybeSingle();
  if (error) throw new Error("Không thể kiểm tra cuốn sổ. Vui lòng thử lại.");
  if (space) redirect("/");
  const params = await searchParams;

  return (
    <main id="noi-dung" className="choice-page">
      <div className="choice-wrap">
        <div className="choice-top"><span className="brand-mark"><BookHeart size={24} /></span><span>Cuốn Sổ tình iu</span></div>
        <p className="eyebrow">CHÀO MỪNG BẠN</p>
        <h1>Hai người, một cuốn sổ</h1>
        <p className="page-intro">Tạo cuốn sổ mới hoặc nhận lời mời từ người yêu. Tài khoản của bạn chỉ tham gia một cuốn sổ.</p>
        {params.error === "create" && <p className="auth-alert" role="alert">Chưa tạo được cuốn sổ. Hãy thử lại.</p>}

        <div className="choice-grid">
          <section className="paper-card choice-card">
            <span className="note-symbol note-symbol-pink"><Plus size={24} /></span>
            <h2>Tạo cuốn sổ mới</h2>
            <p>Bạn sẽ là người tạo cuốn sổ và có thể mời người yêu bằng một đường dẫn riêng.</p>
            <form action="/api/space/create" method="post"><button className="button button-primary" type="submit">Tạo cuốn sổ</button></form>
          </section>
          <section className="paper-card choice-card">
            <span className="note-symbol note-symbol-lavender"><HeartHandshake size={24} /></span>
            <h2>Nhận lời mời</h2>
            <p>Chỉ email được mời mới có thể tham gia. Mỗi lời mời dùng một lần trong 48 giờ.</p>
            <JoinInvitation authenticated />
          </section>
        </div>
        <form action="/auth/logout" method="post"><button className="plain-button" type="submit">Đăng xuất khỏi {viewer.email}</button></form>
      </div>
    </main>
  );
}
