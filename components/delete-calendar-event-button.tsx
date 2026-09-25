"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteCalendarEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!window.confirm("Xóa sự kiện này khỏi lịch chung?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa xóa được sự kiện.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xóa được sự kiện."); setBusy(false); }
  }
  return <span className="calendar-delete-wrap"><button className="calendar-icon-button" type="button" aria-label="Xóa sự kiện" title="Xóa sự kiện" disabled={busy} onClick={remove}><Trash2 size={16} /></button>{error && <small role="alert">{error}</small>}</span>;
}
