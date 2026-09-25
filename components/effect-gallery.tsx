"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heart, RefreshCw, Sparkles } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, useAnimationControls, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { PhotoSecret } from "@/components/photo-secret";
import { DECORATIONS, EFFECT_COUNT, SCENES, decodeEffect, normalizeRecent, pickEffect } from "@/lib/effects/catalog";
import type { EffectPreferences, MotionMode } from "@/lib/effects/preferences";

type Photo = { id: string; note?: string };
type Props = { mode: "memory" | "journey"; photos: Photo[]; title: string; memoryId: string;
  canEdit?: boolean; userId: string; preferences: EffectPreferences; eagerFirst?: boolean };

const places = [
  ["5%", "10%"], ["89%", "15%"], ["94%", "77%"], ["9%", "86%"],
  ["48%", "3%"], ["57%", "91%"], ["3%", "53%"], ["96%", "47%"],
] as const;
const preferenceEvent = "cuon-so-effect-preferences";

const hiddenStates = [
  { opacity: 0 }, { opacity: 0, y: 25 }, { opacity: 0, y: -25 },
  { opacity: 0, x: -30 }, { opacity: 0, x: 30 }, { opacity: 0, rotate: -5, y: 12 },
  { opacity: 0, rotateY: -22, x: -12 }, { opacity: 0, scale: .93 },
  { opacity: 0, scale: 1.06 }, { opacity: 0, rotate: 5, x: 12 },
] as const;

function randomFraction() {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) return Math.random();
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 2 ** 32;
}

function readRecent(userId: string, fallback: number[]) {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`cuon-so-tinh-iu-effect-recent:${userId}`) ?? "null");
    if (Array.isArray(stored) && stored.length > 0) return normalizeRecent(stored);
  } catch { /* The gallery still works when storage is unavailable. */ }
  return normalizeRecent(fallback);
}

function remember(userId: string, recent: number[]) {
  try { localStorage.setItem(`cuon-so-tinh-iu-effect-recent:${userId}`, JSON.stringify(recent)); }
  catch { /* Keeping a local history is optional. */ }
}

async function savePreference(input: Record<string, unknown>) {
  const response = await fetch("/api/effects/preferences", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  const data = await response.json() as { error?: string; codes?: number[]; mode?: MotionMode };
  if (!response.ok) throw new Error(data.error ?? "Chưa lưu được hiệu ứng.");
  return data;
}

export function EffectGallery({ mode, photos, title, memoryId, canEdit = false, userId, preferences, eagerFirst = false }: Props) {
  const [code, setCode] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(preferences.favoriteCodes);
  const [motionMode, setMotionMode] = useState<MotionMode>(preferences.motionMode);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [motionSaving, setMotionSaving] = useState(false);
  const initialized = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const deviceReduced = useReducedMotion();
  const reduced = motionMode === "reduced" || (motionMode === "system" && Boolean(deviceReduced));
  const effect = code === null ? null : decodeEffect(code);

  function choose(pool?: number[]) {
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const recent = readRecent(userId, preferences.recentCodes);
    const result = pickEffect(recent, { mobile, photoCount: photos.length }, randomFraction(), pool);
    if (!result) { setError("Chưa có kiểu yêu thích phù hợp với màn hình này."); return; }
    remember(userId, result.recent);
    setCode(result.code);
    setError("");
    void savePreference({ action: "record", code: result.code }).catch(() => {
      setError("Hiệu ứng vẫn hoạt động, nhưng chưa đồng bộ được lịch sử giữa các thiết bị.");
    });
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    choose();
    // The first selection belongs to this mounted gallery only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: MotionMode; codes?: number[] }>).detail;
      if (detail?.mode) setMotionMode(detail.mode);
      if (Array.isArray(detail?.codes)) setFavorites(detail.codes);
    };
    window.addEventListener(preferenceEvent, sync);
    return () => window.removeEventListener(preferenceEvent, sync);
  }, []);

  useEffect(() => {
    const chosen = code === null ? null : decodeEffect(code);
    if (!chosen) return;
    const active = document.activeElement;
    const editing = active instanceof HTMLElement && root.current?.contains(active)
      && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement);
    const visible = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateY: 0 };
    if (editing) { controls.set(visible); return; }
    controls.set(reduced ? { opacity: .55, x: 0, y: 0, scale: 1, rotate: 0, rotateY: 0 }
      : { ...visible, ...hiddenStates[chosen.entrance] });
    const frame = window.requestAnimationFrame(() => { void controls.start(visible); });
    return () => window.cancelAnimationFrame(frame);
  }, [code, reduced, controls]);

  async function toggleFavorite() {
    if (!code || saving) return;
    setSaving(true); setError("");
    try {
      const data = await savePreference({ action: "favorite", code });
      if (Array.isArray(data.codes)) window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: { codes: data.codes } }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được kiểu yêu thích."); }
    finally { setSaving(false); }
  }

  async function setMotion(next: MotionMode) {
    if (motionSaving || next === motionMode) return;
    const previous = motionMode;
    setMotionMode(next); setMotionSaving(true); setError("");
    try {
      await savePreference({ action: "motion", mode: next });
      window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: { mode: next } }));
    }
    catch (cause) { setMotionMode(previous); setError(cause instanceof Error ? cause.message : "Chưa lưu được chế độ chuyển động."); }
    finally { setMotionSaving(false); }
  }

  return <div className="effect-stage" data-reduced={reduced} ref={root}>
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>{effect && <m.div key={effect.scene} className={`effect-scene scene-${SCENES[effect.scene].id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .12 : .45 }} aria-hidden="true" />}</AnimatePresence>
      {effect && <div className={`effect-decoration decor-${DECORATIONS[effect.decoration].id}`} aria-hidden="true">
        {places.map(([left, top], index) => <span key={index} style={{ left, top, animationDelay: `${index * -.65}s` }}>{DECORATIONS[effect.decoration].symbol}</span>)}
      </div>}
      <div className="effect-toolbar">
        <div className="effect-summary"><span className="effect-summary-mark"><Sparkles size={18} /></span><span><strong>{effect ? `${effect.sceneName} · ${effect.entranceName} · ${effect.decorationName}` : "Đang chọn một khung cảnh…"}</strong><small>{effect ? `Kiểu ${String(effect.code).padStart(4, "0")} / ${EFFECT_COUNT}` : "Hiệu ứng cho kỷ niệm này"}</small></span></div>
        <div className="effect-actions"><button type="button" className="button button-outline" onClick={() => choose()}><RefreshCw size={16} /> Đổi hiệu ứng</button><button type="button" className="effect-icon-button" onClick={() => void toggleFavorite()} disabled={!code || saving} aria-label={code && favorites.includes(code) ? "Bỏ hiệu ứng yêu thích" : "Lưu hiệu ứng yêu thích"} aria-pressed={Boolean(code && favorites.includes(code))} title={code && favorites.includes(code) ? "Bỏ yêu thích" : "Lưu yêu thích"}><Heart size={19} fill={code && favorites.includes(code) ? "currentColor" : "none"} /></button></div>
      </div>
      <div className="effect-subtools">{favorites.length > 0 && <button type="button" className="plain-button" onClick={() => choose(favorites)}>Thử kiểu yêu thích ({favorites.length})</button>}<label>Chuyển động <select value={motionMode} disabled={motionSaving} onChange={(event) => void setMotion(event.target.value as MotionMode)}><option value="system">Theo thiết bị</option><option value="full">Đầy đủ</option><option value="reduced">Giảm chuyển động</option></select></label></div>
      {error && <p className="effect-error" role="status">{error}</p>}
      <div className={mode === "memory" ? "memory-detail-photos effect-photo-grid" : "journey-photo-grid effect-photo-grid"}>
        {photos.map((photo, index) => <m.div className="effect-photo" key={photo.id} initial={false} animate={controls} transition={{ duration: reduced ? .16 : .52, delay: reduced ? 0 : Math.min(index * .065, .35), ease: "easeOut" }}>
          {mode === "memory" ? <PhotoSecret id={photo.id} title={title} index={index} initialNote={photo.note ?? ""} canEdit={canEdit} /> : <Link className="journey-polaroid" href={`/memories/${memoryId}`} aria-label={`Mở ảnh ${index + 1} của ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${photo.id}`} alt={`Ảnh ${index + 1} của ${title}`} loading={eagerFirst && index === 0 ? "eager" : "lazy"} /><span>{index === 0 ? title : `Khoảnh khắc ${index + 1}`}</span>
          </Link>}
        </m.div>)}
      </div>
    </LazyMotion>
  </div>;
}
