"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { pickMemoryDay } from "@/lib/memories/random-day";

const storageKey = "cuon-so-tinh-iu-recent-days";

export function RandomDayButton({ days, currentDay, label = "Về một ngày bất kỳ" }: { days: string[]; currentDay?: string; label?: string }) {
  const router = useRouter();
  function travel() {
    let recent: string[] = [];
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored)) recent = stored.filter((item): item is string => typeof item === "string");
    } catch { /* Storage can be unavailable in private browsing. */ }
    if (currentDay) recent = [...recent.filter((day) => day !== currentDay), currentDay];
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const result = pickMemoryDay(days, recent, random[0] / 2 ** 32);
    if (!result) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(result.recent)); } catch { /* Navigation still works. */ }
    router.push(`/time-machine?day=${result.day}`);
  }
  return <button className="button button-soft" type="button" disabled={days.length === 0} title={days.length === 0 ? "Cần có ít nhất một kỷ niệm đã đăng" : undefined} onClick={travel}><Sparkles size={17} /> {label}</button>;
}
