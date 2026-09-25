"use client";

import { useState, type FormEvent } from "react";
import { Eye, Heart, Pencil } from "lucide-react";

export function PhotoSecret({ id, title, index, initialNote, canEdit }: { id: string; title: string; index: number; initialNote: string; canEdit: boolean }) {
  const [note, setNote] = useState(initialNote);
  const [draft, setDraft] = useState(initialNote);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const caption = index === 0 ? title : `Khoảnh khắc ${index + 1}`;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/photos/${id}/note`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: draft }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa lưu được lời nhắn.");
      setNote(draft.trim()); setEditing(false);
      if (!draft.trim()) setFlipped(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được lời nhắn."); }
    finally { setBusy(false); }
  }

  return <figure className="detail-polaroid photo-secret-card">
    {!flipped ? <>
      {note || canEdit ? <button className="photo-front-button" type="button" onClick={() => { setFlipped(true); setEditing(!note && canEdit); }} aria-label={note ? `Lật ảnh ${index + 1} để đọc lời nhắn` : `Viết lời nhắn sau ảnh ${index + 1}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/photos/${id}`} alt={`Ảnh ${index + 1} của kỷ niệm ${title}`} />
        <span className="photo-flip-hint">{note ? "Lật ảnh đọc lời nhắn ♡" : "Viết lời nhắn sau ảnh ♡"}</span>
      </button> : <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/photos/${id}`} alt={`Ảnh ${index + 1} của kỷ niệm ${title}`} />
      </>}
    </> : <div className="photo-back" aria-label={`Mặt sau ảnh ${index + 1}`}>
      <span className="photo-back-mark" aria-hidden="true"><Heart size={27} /></span>
      {editing ? <form onSubmit={save} className="photo-note-form">
        <label htmlFor={`photo-note-${id}`}>Lời nhắn bí mật</label>
        <textarea id={`photo-note-${id}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} rows={5} placeholder="Một điều mình muốn người ấy đọc khi lật ảnh..." disabled={busy} />
        <small>{draft.length}/500</small>
        {error && <p role="alert">{error}</p>}
        <div><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Lưu lời nhắn"}</button><button className="plain-button" type="button" disabled={busy} onClick={() => { setDraft(note); setEditing(false); setError(""); if (!note) setFlipped(false); }}>Hủy</button></div>
      </form> : <><p className="photo-handwritten">{note}</p><div className="photo-back-actions"><button className="button button-soft" type="button" onClick={() => setFlipped(false)}><Eye size={16} /> Xem ảnh</button>{canEdit && <button className="plain-button" type="button" onClick={() => { setEditing(true); setError(""); }}><Pencil size={15} /> Sửa lời nhắn</button>}</div></>}
    </div>}
    <figcaption>{caption}</figcaption>
  </figure>;
}
