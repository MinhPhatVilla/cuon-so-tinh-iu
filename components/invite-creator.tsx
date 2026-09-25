"use client";

import { useState, type FormEvent } from "react";

export function InviteCreator() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLink("");
    setMessage("");
    try {
      const response = await fetch("/api/space/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { token?: unknown; error?: string };
      if (!response.ok || typeof data.token !== "string") {
        setMessage(data.error ?? "Chưa tạo được lời mời. Hãy thử lại.");
        return;
      }
      setLink(`${window.location.origin}/join#token=${data.token}`);
      setMessage("Đã tạo lời mời. Đường dẫn có hiệu lực trong 48 giờ và chỉ dùng một lần.");
    } catch {
      setMessage("Kết nối bị gián đoạn. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Đã sao chép đường dẫn mời.");
    } catch {
      setMessage("Không tự sao chép được. Hãy chọn và sao chép đường dẫn bên dưới.");
    }
  }

  return (
    <div className="invite-creator">
      <form className="auth-form" onSubmit={create}>
        <label htmlFor="partner-email">Email của người yêu</label>
        <input id="partner-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="nguoiyeu@example.com" />
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Đang tạo..." : "Tạo đường dẫn mời"}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      {link && <div className="invite-result">
        <label htmlFor="created-invite">Đường dẫn riêng</label>
        <input id="created-invite" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
        <button className="button button-soft" type="button" onClick={copy}>Sao chép đường dẫn</button>
        <p>Gửi đường dẫn này cho đúng email vừa nhập. Tạo lời mời mới sẽ hủy lời mời cũ chưa dùng.</p>
      </div>}
    </div>
  );
}
