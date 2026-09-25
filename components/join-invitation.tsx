"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const key = "cuon-so-tinh-iu-invite";
const tokenPattern = /^[0-9a-f]{64}$/;

function tokenFromInput(value: string) {
  const raw = value.trim();
  if (tokenPattern.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    return token && tokenPattern.test(token) ? token : null;
  } catch { return null; }
}

export function JoinInvitation({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token");
    const saved = sessionStorage.getItem(key);
    const selected = incoming && tokenPattern.test(incoming) ? incoming : saved && tokenPattern.test(saved) ? saved : "";
    if (selected) { sessionStorage.setItem(key, selected); queueMicrotask(() => setToken(selected)); }
    if (incoming) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  function remember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = tokenFromInput(input);
    if (!selected) { setMessage("Hãy dán đúng đường dẫn hoặc mã mời."); return; }
    sessionStorage.setItem(key, selected);
    setToken(selected);
    setInput("");
    setMessage("Đã nhận đường dẫn mời. Bạn có thể tiếp tục.");
  }

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/space/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setMessage(data.error ?? "Chưa nhận được lời mời."); return; }
      sessionStorage.removeItem(key);
      router.replace("/");
      router.refresh();
    } catch { setMessage("Kết nối bị gián đoạn. Hãy thử lại."); }
    finally { setBusy(false); }
  }

  return (
    <div className="join-invitation">
      <form onSubmit={remember} className="invite-input-form">
        <label htmlFor="invite-link">Đường dẫn hoặc mã mời</label>
        <input id="invite-link" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Dán lời mời vào đây" autoComplete="off" />
        <button className="button button-soft" type="submit">Lưu lời mời</button>
      </form>
      {token && <p className="invite-ready">✓ Lời mời đã sẵn sàng trên thiết bị này.</p>}
      {message && <p className="form-message" role="status">{message}</p>}
      {authenticated ? (
        <button className="button button-primary" type="button" disabled={!token || busy} onClick={accept}>{busy ? "Đang kiểm tra..." : "Tham gia cuốn sổ"}</button>
      ) : (
        <Link className="button button-primary" href="/login?next=%2Fjoin">Đăng nhập để nhận lời mời</Link>
      )}
    </div>
  );
}
