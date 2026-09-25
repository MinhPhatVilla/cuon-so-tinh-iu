import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryCard = {
  id: string;
  title: string;
  story: string;
  date: string;
  status: "draft" | "published";
  authorId: string;
  place: { name: string; latitude: number | null; longitude: number | null } | null;
  photos: { id: string; sortOrder: number }[];
};

export async function getVisibleMemories(supabase: SupabaseClient, spaceId: string): Promise<MemoryCard[]> {
  type MemoryRow = { id: string; title: string; story: string; memory_date: string; status: "draft" | "published"; author_id: string; place_id: string | null };
  const memories: MemoryRow[] = [];
  for (let from = 0; ; from += 200) {
    const { data, error } = await supabase.from("memories")
      .select("id,title,story,memory_date,status,author_id,place_id,created_at")
      .eq("space_id", spaceId)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id").range(from, from + 199);
    if (error) throw new Error("Không thể tải kỷ niệm. Vui lòng thử lại.");
    memories.push(...(data ?? []) as MemoryRow[]);
    if (!data || data.length < 200) break;
  }
  if (!memories.length) return [];
  const photosByMemory = new Map<string, { id: string; sortOrder: number }[]>();
  const places = new Map<string, { id: string; name: string; latitude: number | null; longitude: number | null }>();
  for (let from = 0; from < memories.length; from += 100) {
    const group = memories.slice(from, from + 100);
    const placeIds = [...new Set(group.map((memory) => memory.place_id).filter((id): id is string => !!id))];
    const [photosResult, placesResult] = await Promise.all([
      supabase.from("photos").select("id,memory_id,sort_order").in("memory_id", group.map((memory) => memory.id)).order("sort_order"),
      placeIds.length ? supabase.from("places").select("id,name,latitude,longitude").in("id", placeIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (photosResult.error || placesResult.error) throw new Error("Không thể tải ảnh kỷ niệm. Vui lòng thử lại.");
    for (const photo of photosResult.data ?? []) {
      const list = photosByMemory.get(photo.memory_id) ?? [];
      list.push({ id: photo.id, sortOrder: photo.sort_order });
      photosByMemory.set(photo.memory_id, list);
    }
    for (const place of placesResult.data ?? []) places.set(place.id, place);
  }
  return memories.map((memory) => {
    const place = memory.place_id ? places.get(memory.place_id) : null;
    return {
      id: memory.id,
      title: memory.title,
      story: memory.story,
      date: memory.memory_date,
      status: memory.status,
      authorId: memory.author_id,
      place: place ? { name: place.name, latitude: place.latitude, longitude: place.longitude } : null,
      photos: photosByMemory.get(memory.id) ?? [],
    };
  });
}
