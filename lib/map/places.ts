import type { MemoryCard } from "@/lib/memories/queries";

export type PlaceVisit = {
  id: string;
  title: string;
  date: string;
  coverId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type MemoryPlace = {
  key: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  visits: PlaceVisit[];
};

function safeCoordinates(latitude: number | null, longitude: number | null) {
  return latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const radians = Math.PI / 180;
  const latDelta = (bLat - aLat) * radians;
  const lonDelta = (bLon - aLon) * radians;
  const chord = Math.sin(latDelta / 2) ** 2
    + Math.cos(aLat * radians) * Math.cos(bLat * radians) * Math.sin(lonDelta / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function groupMemoryPlaces(memories: MemoryCard[]): MemoryPlace[] {
  const groups = new Map<string, MemoryPlace>();
  for (const memory of memories) {
    if (memory.status !== "published" || !memory.place) continue;
    const { name, latitude, longitude } = memory.place;
    const hasCoordinates = safeCoordinates(latitude, longitude);
    const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").trim().toLocaleLowerCase("vi-VN");
    let group = hasCoordinates
      ? [...groups.values()].find((item) => item.key.startsWith(`${normalizedName}|`) && item.latitude !== null && item.longitude !== null
        && distanceMeters(item.latitude, item.longitude, latitude!, longitude!) <= 150)
      : groups.get(`${normalizedName}|no-pin`);
    if (!group) {
      group = { key: `${normalizedName}|${hasCoordinates ? memory.id : "no-pin"}`, name,
        latitude: hasCoordinates ? latitude : null, longitude: hasCoordinates ? longitude : null, visits: [] };
      groups.set(group.key, group);
    }
    group.visits.push({ id: memory.id, title: memory.title, date: memory.date, coverId: memory.photos[0]?.id ?? null,
      latitude: hasCoordinates ? latitude : null, longitude: hasCoordinates ? longitude : null });
  }
  for (const [key, group] of groups) {
    if (!key.endsWith("|no-pin")) continue;
    const matching = [...groups.values()].filter((item) => item.key.startsWith(`${key.slice(0, -7)}|`) && item.latitude !== null);
    if (matching.length === 1) { matching[0].visits.push(...group.visits); groups.delete(key); }
  }
  return [...groups.values()].map((group) => ({ ...group, visits: group.visits.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)) }))
    .sort((a, b) => b.visits[0].date.localeCompare(a.visits[0].date) || a.name.localeCompare(b.name, "vi"));
}

export function journeyCoordinates(places: MemoryPlace[]): [number, number][] {
  const visits = places.flatMap((place) => place.visits)
    .filter((visit) => safeCoordinates(visit.latitude, visit.longitude))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const points: [number, number][] = [];
  for (const visit of visits) {
    const point: [number, number] = [visit.longitude!, visit.latitude!];
    if (points.length === 0 || points.at(-1)![0] !== point[0] || points.at(-1)![1] !== point[1]) points.push(point);
  }
  return points;
}
