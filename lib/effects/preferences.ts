import type { SupabaseClient } from "@supabase/supabase-js";
import { isEffectCode, normalizeRecent } from "./catalog";

export type MotionMode = "system" | "full" | "reduced";
export type EffectPreferences = { motionMode: MotionMode; favoriteCodes: number[]; recentCodes: number[] };
export const defaultEffectPreferences: EffectPreferences = { motionMode: "system", favoriteCodes: [], recentCodes: [] };

export async function getEffectPreferences(supabase: SupabaseClient, userId: string): Promise<EffectPreferences> {
  const { data, error } = await supabase.from("effect_preferences")
    .select("motion_mode,favorite_codes,recent_codes").eq("user_id", userId).maybeSingle();
  if (error || !data) return defaultEffectPreferences;
  return {
    motionMode: data.motion_mode === "full" || data.motion_mode === "reduced" ? data.motion_mode : "system",
    favoriteCodes: Array.isArray(data.favorite_codes) ? data.favorite_codes.filter(isEffectCode).slice(0, 50) : [],
    recentCodes: normalizeRecent(data.recent_codes),
  };
}
