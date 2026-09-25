export function pickMemoryDay(days: string[], recent: string[], randomValue: number) {
  const unique = [...new Set(days)];
  if (unique.length === 0) return null;
  const validRecent = [...new Set(recent.filter((day) => unique.includes(day)))];
  let pool = unique.filter((day) => !validRecent.includes(day));
  if (pool.length === 0) {
    const protectedRecent = unique.length > 1 ? validRecent.slice(-(unique.length - 1)) : [];
    pool = unique.filter((day) => !protectedRecent.includes(day));
  }
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(randomValue, .999999999)) * pool.length));
  const day = pool[index];
  return { day, recent: [...validRecent.filter((item) => item !== day), day].slice(-20) };
}
