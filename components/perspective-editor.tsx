"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function PerspectiveEditor({ memoryId, initialStory }: { memoryId: string; initialStory: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialStory);
  const [draft, setDraft] = useState(initialStory);
  const [editing, setEditing] = useState(!initialStory);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/memories/${memoryId}/perspective`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ story: draft }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa lưu được góc nhìn.");
      setSaved(draft.trim()); setEditing(false); router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Chưa lưu được góc nhìn."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Xóa góc nhìn của bạn khỏi kỷ niệm này?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/memories/${memoryId}/perspective`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa xóa được góc nhìn.");
      setSaved(""); setDraft(""); setEditing(true); router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Chưa xóa được góc nhìn."); }
    finally { setBusy(false); }
  }

  return <div className="perspective-entry perspective-entry-partner">
    <p className="eyebrow">GÓC NHÌN CỦA BẠN</p>
    {!editing && saved ? <><p className="perspective-text">{saved}</p><div className="perspective-actions"><button className="text-link" type="button" onClick={() => { setDraft(saved); setEditing(true); }}>Sửa lời kể</button><button className="plain-button" type="button" disabled={busy} onClick={remove}>Xóa lời kể</button></div></> : <form className="perspective-form" onSubmit={save}>
      <label htmlFor="partner-story">Bạn nhớ điều gì về ngày ấy?</label>
      <textarea id="partner-story" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={3000} rows={5} required disabled={busy} placeholder="Có thể là một chi tiết chỉ bạn mới nhớ..." />
      <small>{draft.length}/3000 ký tự</small>
      <div className="perspective-actions"><button className="button button-primary" type="submit" disabled={busy || !draft.trim()}>{busy ? "Đang lưu..." : "Lưu góc nhìn"}</button>{saved && <button className="plain-button" type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(saved); setMessage(""); }}>Hủy</button>}</div>
    </form>}
    {message && <p className="form-message" role="alert">{message}</p>}
  </div>;
}
