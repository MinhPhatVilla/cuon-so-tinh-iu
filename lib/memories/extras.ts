import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMemoryExtras(supabase: SupabaseClient, memoryId: string) {
  const [photosResult, perspectivesResult] = await Promise.all([
    supabase.from("photos").select("id,secret_note").eq("memory_id", memoryId),
    supabase.from("memory_perspectives").select("author_id,story").eq("memory_id", memoryId),
  ]);
  if (photosResult.error || perspectivesResult.error) throw new Error("Không thể tải lời nhắn của kỷ niệm. Vui lòng thử lại.");
  return {
    notes: new Map<string, string>((photosResult.data ?? []).map((photo) => [photo.id, photo.secret_note])),
    perspectives: (perspectivesResult.data ?? []).map((item) => ({ authorId: item.author_id as string, story: item.story as string })),
  };
}
