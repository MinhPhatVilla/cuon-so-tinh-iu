export const SCENES = [
  { id: "spring", name: "Xuân dịu" }, { id: "summer", name: "Hạ trong" },
  { id: "autumn", name: "Thu ấm" }, { id: "winter", name: "Đông êm" },
  { id: "dawn", name: "Bình minh" }, { id: "sunset", name: "Hoàng hôn" },
  { id: "starlight", name: "Đêm sao" }, { id: "garden", name: "Vườn nhỏ" },
  { id: "seaside", name: "Bờ biển" }, { id: "lavender", name: "Tím mơ" },
] as const;

export const ENTRANCES = [
  { id: "dissolve", name: "Hiện dịu" }, { id: "rise", name: "Bay lên" },
  { id: "descend", name: "Rơi xuống" }, { id: "from-left", name: "Từ trái" },
  { id: "from-right", name: "Từ phải" }, { id: "tilt-left", name: "Nghiêng trái" },
  { id: "page-turn", name: "Lật trang" }, { id: "grow", name: "Lớn dần" },
  { id: "settle", name: "Lắng lại" }, { id: "paper-sway", name: "Giấy đu đưa" },
] as const;

export const DECORATIONS = [
  { id: "petals", name: "Cánh hoa", symbol: "✿" }, { id: "sparkles", name: "Tia sao", symbol: "✦" },
  { id: "hearts", name: "Tim nhỏ", symbol: "♡" }, { id: "leaves", name: "Lá non", symbol: "❧" },
  { id: "snow", name: "Tuyết mềm", symbol: "✧" }, { id: "fireflies", name: "Đom đóm", symbol: "·" },
  { id: "bubbles", name: "Bọt sáng", symbol: "○" }, { id: "ribbons", name: "Ruy băng", symbol: "〰" },
  { id: "sunrays", name: "Nắng vàng", symbol: "✴" }, { id: "confetti", name: "Chấm màu", symbol: "•" },
] as const;

export const EFFECT_COUNT = SCENES.length * ENTRANCES.length * DECORATIONS.length;

export function isEffectCode(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= EFFECT_COUNT;
}

export function decodeEffect(code: number) {
  if (!isEffectCode(code)) return null;
  const index = code - 1;
  const scene = Math.floor(index / 100);
  const entrance = Math.floor(index % 100 / 10);
  const decoration = index % 10;
  return { code, scene, entrance, decoration, sceneName: SCENES[scene].name,
    entranceName: ENTRANCES[entrance].name, decorationName: DECORATIONS[decoration].name };
}

export function encodeEffect(scene: number, entrance: number, decoration: number) {
  if (![scene, entrance, decoration].every((value) => Number.isInteger(value) && value >= 0 && value < 10)) return null;
  return scene * 100 + entrance * 10 + decoration + 1;
}

export function isSuitableEffect(code: number, context: { mobile: boolean; photoCount: number }) {
  const effect = decodeEffect(code);
  if (!effect) return false;
  if (context.mobile && (effect.entrance === 6 || effect.entrance === 9)) return false;
  if (context.photoCount > 4 && (effect.decoration === 7 || effect.decoration === 8)) return false;
  return true;
}

export function normalizeRecent(values: unknown) {
  if (!Array.isArray(values)) return [] as number[];
  return values.filter(isEffectCode).reduce<number[]>((items, code) => [...items.filter((item) => item !== code), code], []).slice(-20);
}

export function pickEffect(recent: number[], context: { mobile: boolean; photoCount: number }, randomValue: number, favorites?: number[]) {
  const eligible = Array.from({ length: EFFECT_COUNT }, (_, index) => index + 1)
    .filter((code) => isSuitableEffect(code, context) && (!favorites || favorites.includes(code)));
  if (eligible.length === 0) return null;
  const last = normalizeRecent(recent);
  let pool = eligible.filter((code) => !last.includes(code));
  if (pool.length === 0) {
    const protectedRecent = eligible.length > 1 ? last.slice(-(eligible.length - 1)) : [];
    pool = eligible.filter((code) => !protectedRecent.includes(code));
  }
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(randomValue, .999999999)) : 0;
  const code = pool[Math.floor(normalized * pool.length)];
  return { code, recent: normalizeRecent([...last, code]) };
}
