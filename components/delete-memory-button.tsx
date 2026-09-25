"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteMemoryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!window.confirm("Xóa kỷ niệm và tất cả ảnh trong trang này? Bạn không thể hoàn tác.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa xóa được kỷ niệm.");
      router.replace("/album"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xóa được kỷ niệm."); setBusy(false); }
  }
  return <div><button className="button button-danger" type="button" disabled={busy} onClick={remove}><Trash2 size={17} /> {busy ? "Đang xóa..." : "Xóa kỷ niệm"}</button>{error && <p className="form-message" role="alert">{error}</p>}</div>;
}
