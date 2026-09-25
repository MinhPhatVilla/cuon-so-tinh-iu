export type MemoryInput = {
  title: string;
  story: string;
  date: string;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseMemoryInput(value: unknown): MemoryInput | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.title !== "string" || typeof data.story !== "string" || typeof data.date !== "string") return null;
  const title = data.title.trim();
  const story = data.story.trim();
  if (!title || title.length > 120 || story.length > 3000) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
  const parsedDate = new Date(`${data.date}T00:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data.date) return null;
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (data.date < "1900-01-01" || data.date > tomorrow.toISOString().slice(0, 10)) return null;
  const placeName = typeof data.placeName === "string" ? data.placeName.trim() : "";
  if (placeName.length > 120) return null;
  const latitude = data.latitude === null || data.latitude === undefined || data.latitude === "" ? null : Number(data.latitude);
  const longitude = data.longitude === null || data.longitude === undefined || data.longitude === "" ? null : Number(data.longitude);
  if ((latitude === null) !== (longitude === null)) return null;
  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return null;
  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return null;
  if (latitude !== null && !placeName) return null;
  return { title, story, date: data.date, placeName: placeName || null, latitude, longitude };
}

export type ImageExtension = "jpg" | "png" | "webp" | "heic" | "heif";

export function imageExtension(file: File): ImageExtension | null {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic" || (!file.type && /\.heic$/i.test(file.name))) return "heic";
  if (file.type === "image/heif" || (!file.type && /\.heif$/i.test(file.name))) return "heif";
  return null;
}

export async function hasImageSignature(file: File, extension: ImageExtension) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (extension === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (extension === "heic" || extension === "heif") {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
      && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  }
  return bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70
    && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
}
