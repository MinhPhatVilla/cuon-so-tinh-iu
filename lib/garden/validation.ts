import { isDateKey, todayInVietnam } from "@/lib/calendar/date";

export type GiftKind = "flower" | "card" | "star";

export function parseGift(value: unknown): { kind: GiftKind; message: string } | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.kind !== "flower" && data.kind !== "card" && data.kind !== "star") return null;
  if (typeof data.message !== "string") return null;
  const message = data.message.trim();
  return message.length >= 1 && message.length <= 500 ? { kind: data.kind, message } : null;
}

export function parseLetter(value: unknown): { title: string; body: string; opensOn: string } | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.title !== "string" || typeof data.body !== "string" || !isDateKey(data.opensOn)) return null;
  const title = data.title.trim();
  const body = data.body.trim();
  const latest = new Date(`${todayInVietnam()}T12:00:00Z`);
  latest.setUTCFullYear(latest.getUTCFullYear() + 10);
  return title.length >= 1 && title.length <= 100 && body.length >= 1 && body.length <= 5000
    && data.opensOn > todayInVietnam() && data.opensOn <= latest.toISOString().slice(0, 10)
    ? { title, body, opensOn: data.opensOn } : null;
}
