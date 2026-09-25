export type CalendarEvent = {
  id: string;
  authorId: string;
  date: string;
  time: string | null;
  title: string;
  note: string;
  kind: "anniversary" | "plan" | "reminder";
  recurrence: "none" | "yearly";
  remindDaysBefore: number;
};

export type EventOccurrence = { event: CalendarEvent; date: string; daysUntil: number };

const dayMs = 86_400_000;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isMonthKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2100;
}

export function todayInVietnam(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDate(date: string, days: number) {
  const time = Date.parse(`${date}T12:00:00Z`) + days * dayMs;
  return new Date(time).toISOString().slice(0, 10);
}

export function shiftMonth(month: string, offset: number) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1, 12)).toISOString().slice(0, 7);
}

export function daysInMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function monthGrid(month: string) {
  const first = `${month}-01`;
  const mondayOffset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => shiftDate(first, index - mondayOffset));
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / dayMs);
}

export function occurrenceInMonth(event: CalendarEvent, month: string): string | null {
  if (event.recurrence === "none") return event.date.slice(0, 7) === month ? event.date : null;
  const year = Number(month.slice(0, 4));
  const originalYear = Number(event.date.slice(0, 4));
  if (year < originalYear || event.date.slice(5, 7) !== month.slice(5, 7)) return null;
  const day = Number(event.date.slice(8, 10));
  return day <= daysInMonth(month) ? `${month}-${String(day).padStart(2, "0")}` : null;
}

export function nextOccurrence(event: CalendarEvent, from: string): string | null {
  if (event.recurrence === "none") return event.date >= from ? event.date : null;
  const monthDay = event.date.slice(5);
  const firstYear = Math.max(Number(from.slice(0, 4)), Number(event.date.slice(0, 4)));
  for (let year = firstYear; year <= 2100; year++) {
    const date = `${year}-${monthDay}`;
    if (isDateKey(date) && date >= from) return date;
  }
  return null;
}

export function upcomingReminders(events: CalendarEvent[], today: string): EventOccurrence[] {
  return events.flatMap((event) => {
    const date = nextOccurrence(event, today);
    if (!date) return [];
    const daysUntil = daysBetween(today, date);
    return daysUntil >= 0 && daysUntil <= event.remindDaysBefore ? [{ event, date, daysUntil }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.event.time ?? "").localeCompare(b.event.time ?? ""));
}

export function formatDateVi(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}
