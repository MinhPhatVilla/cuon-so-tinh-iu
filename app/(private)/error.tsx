"use client";

export default function PrivateError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="section-page error-page" role="alert"><p className="eyebrow">TRANG SỔ TẠM THỜI CHƯA MỞ</p><h1>Chưa tải được kỷ niệm</h1><p>Kết nối có thể bị gián đoạn. Hãy thử lại sau một lát.</p><button className="button button-primary" type="button" onClick={reset}>Thử lại</button></div>;
}
