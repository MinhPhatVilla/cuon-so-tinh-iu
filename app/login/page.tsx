import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookHeart, LockKeyhole } from "lucide-react";
import { getVerifiedViewer } from "@/lib/supabase/access";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/lib/auth/request";

export const metadata: Metadata = { title: "Đăng nhập" };
export const dynamic = "force-dynamic";

const errorText: Record<string, string> = {
  invalid: "Hãy kiểm tra email và dùng mật khẩu từ 8 đến 128 ký tự.",
  credentials: "Email hoặc mật khẩu chưa đúng.",
  signup: "Chưa tạo được tài khoản. Hãy thử lại hoặc dùng email khác.",
  confirmation: "Liên kết xác nhận không hợp lệ hoặc đã hết hạn.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string; notice?: string; next?: string; setup?: string }> }) {
  const params = await searchParams;
  const viewer = await getVerifiedViewer();
  if (viewer) redirect("/welcome");

  const signup = params.mode === "signup";
  const next = safeNext(params.next);
  const configured = hasSupabaseConfig();

  return (
    <main id="noi-dung" className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <span className="auth-flower auth-flower-one">✿</span>
        <span className="auth-flower auth-flower-two">✦</span>
        <div className="auth-book"><BookHeart size={82} strokeWidth={1.1} /><span>Chỉ hai đứa mình ♡</span></div>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="brand auth-brand" href="/login"><span className="brand-mark"><BookHeart size={22} /></span><span>Cuốn Sổ tình iu</span></Link>
        <p className="eyebrow">GÓC RIÊNG CỦA HAI ĐỨA</p>
        <h1 id="auth-title">{signup ? "Tạo tài khoản của bạn" : "Mừng bạn trở lại"}</h1>
        <p className="auth-intro">{signup ? "Mỗi người có tài khoản riêng để cùng giữ kỷ niệm trong một cuốn sổ." : "Đăng nhập để mở những trang chỉ hai người được xem."}</p>

        {!configured && <div className="auth-alert" role="status"><LockKeyhole size={19} /> Kết nối tài khoản đang được thiết lập. Biểu mẫu sẽ mở khi Supabase được kết nối.</div>}
        {configured && params.notice === "check-email" && <div className="auth-alert auth-alert-success" role="status">Hãy mở email để xác nhận tài khoản, rồi quay lại đăng nhập.</div>}
        {configured && params.error && errorText[params.error] && <div className="auth-alert" role="alert">{errorText[params.error]}</div>}

        <form className="auth-form" action="/auth/login" method="post">
          <input type="hidden" name="mode" value={signup ? "signup" : "login"} />
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email">Email của bạn</label>
          <input id="email" name="email" type="email" autoComplete="email" required disabled={!configured} placeholder="ban@example.com" />
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} maxLength={128} required disabled={!configured} placeholder="Từ 8 ký tự" />
          <button className="button button-primary" type="submit" disabled={!configured}>{signup ? "Tạo tài khoản" : "Đăng nhập"}</button>
        </form>
        <p className="auth-switch">{signup ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={`/login?mode=${signup ? "login" : "signup"}&next=${encodeURIComponent(next)}`}>{signup ? "Đăng nhập" : "Tạo tài khoản"}</Link></p>
      </section>
    </main>
  );
}
