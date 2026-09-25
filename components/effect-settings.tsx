"use client";

import { useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { decodeEffect } from "@/lib/effects/catalog";
import type { EffectPreferences, MotionMode } from "@/lib/effects/preferences";

const motionOptions: { value: MotionMode; label: string; detail: string }[] = [
  { value: "system", label: "Theo thiết bị", detail: "Tự giảm khi điện thoại hoặc máy tính yêu cầu." },
  { value: "full", label: "Đầy đủ", detail: "Cho phép ảnh chuyển động nhẹ và trang trí trôi chậm." },
  { value: "reduced", label: "Giảm chuyển động", detail: "Giữ màu sắc và bố cục; ảnh chỉ đổi độ mờ nhẹ." },
];

export function EffectSettings({ initial }: { initial: EffectPreferences }) {
  const [mode, setMode] = useState(initial.motionMode);
  const [favorites, setFavorites] = useState(initial.favoriteCodes);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function update(input: Record<string, unknown>) {
    const response = await fetch("/api/effects/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const data = await response.json() as { error?: string; codes?: number[] };
    if (!response.ok) throw new Error(data.error ?? "Chưa lưu được cài đặt.");
    return data;
  }

  async function changeMode(next: MotionMode) {
    if (pending || next === mode) return;
    const previous = mode;
    setMode(next); setPending(true); setMessage("");
    try { await update({ action: "motion", mode: next }); setMessage("Đã lưu chế độ chuyển động."); }
    catch (error) { setMode(previous); setMessage(error instanceof Error ? error.message : "Chưa lưu được cài đặt."); }
    finally { setPending(false); }
  }

  async function removeFavorite(code: number) {
    if (pending) return;
    setPending(true); setMessage("");
    try {
      const data = await update({ action: "favorite", code });
      if (Array.isArray(data.codes)) setFavorites(data.codes);
      setMessage("Đã cập nhật danh sách yêu thích.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa cập nhật được danh sách."); }
    finally { setPending(false); }
  }

  return <section className="paper-card effect-settings" aria-labelledby="effect-settings-heading">
    <div className="effect-settings-heading"><span className="note-symbol note-symbol-sage"><Sparkles size={23} /></span><div><p className="eyebrow">HIỆU ỨNG CỦA RIÊNG BẠN</p><h2 id="effect-settings-heading">Khung cảnh và chuyển động</h2></div></div>
    <p>Mỗi kỷ niệm tự chọn một trong 1.000 tổ hợp. Lựa chọn này chỉ ảnh hưởng cách bạn xem ảnh, không sửa ảnh hoặc câu chuyện đã lưu.</p>
    <fieldset className="effect-motion-options" disabled={pending}><legend>Mức chuyển động</legend>{motionOptions.map((option) => <label key={option.value} className={mode === option.value ? "is-selected" : ""}><input type="radio" name="motion-mode" value={option.value} checked={mode === option.value} onChange={() => void changeMode(option.value)} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</fieldset>
    <div className="effect-favorites"><h3><Heart size={18} /> Kiểu đã yêu thích ({favorites.length}/50)</h3>{favorites.length === 0 ? <p>Ở trang kỷ niệm, bấm nút trái tim bên cạnh hiệu ứng để lưu kiểu bạn thích.</p> : <ul>{favorites.map((code) => {
      const effect = decodeEffect(code);
      if (!effect) return null;
      return <li key={code}><span><strong>#{String(code).padStart(4, "0")}</strong> {effect.sceneName} · {effect.entranceName} · {effect.decorationName}</span><button type="button" onClick={() => void removeFavorite(code)} disabled={pending} aria-label={`Bỏ yêu thích kiểu ${code}`}>Bỏ</button></li>;
    })}</ul>}</div>
    {message && <p className="effect-settings-message" role="status">{message}</p>}
  </section>;
}
