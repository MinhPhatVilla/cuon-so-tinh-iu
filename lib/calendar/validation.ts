import { isDateKey } from "./date";

export type EventInput = {
  date: string;
  time: string | null;
  title: string;
  note: string;
  kind: "anniversary" | "plan" | "reminder";
  recurrence: "none" | "yearly";
  remindDaysBefore: number;
};

export function parseEventInput(value: unknown): EventInput | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!isDateKey(data.date) || data.date < "1900-01-01" || data.date > "2100-12-31") return null;
  if (typeof data.title !== "string" || typeof data.note !== "string") return null;
  const title = data.title.trim();
  const note = data.note.trim();
  if (!title || title.length > 120 || note.length > 1000) return null;
  const time = data.time === null || data.time === "" || data.time === undefined ? null : data.time;
  if (time !== null && (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  if (data.kind !== "anniversary" && data.kind !== "plan" && data.kind !== "reminder") return null;
  if (data.recurrence !== "none" && data.recurrence !== "yearly") return null;
  const remindDaysBefore = Number(data.remindDaysBefore);
  if (!Number.isInteger(remindDaysBefore) || remindDaysBefore < 0 || remindDaysBefore > 30) return null;
  return { date: data.date, time, title, note, kind: data.kind, recurrence: data.recurrence, remindDaysBefore };
}
