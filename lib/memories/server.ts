import type { SupabaseClient } from "@supabase/supabase-js";
import { getVerifiedViewer } from "@/lib/supabase/access";

export async function getMemoryViewer() {
  const viewer = await getVerifiedViewer();
  if (!viewer) return null;
  const { data: membership, error } = await viewer.supabase
    .from("couple_members").select("space_id").eq("user_id", viewer.id).maybeSingle();
  if (error || !membership) return null;
  return { ...viewer, spaceId: membership.space_id as string };
}

export async function cleanPendingPhotos(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("list_pending_photo_deletes");
  if (error || !Array.isArray(data) || data.length === 0) return;
  const paths = data.map((item: { path?: string }) => item.path).filter((path: unknown): path is string => typeof path === "string");
  if (paths.length === 0) return;
  const { error: storageError } = await supabase.storage.from("couple-photos").remove(paths);
  if (!storageError) await supabase.rpc("finish_photo_deletes", { p_paths: paths });
}

export async function cleanOrQueueOrphanPhotos(supabase: SupabaseClient, paths: string[]) {
  const { error } = await supabase.storage.from("couple-photos").remove(paths);
  if (error) await supabase.rpc("queue_orphan_photo_cleanup", { p_paths: paths });
}

export async function getMemoryOwnedBy(supabase: SupabaseClient, memoryId: string, userId: string) {
  const { data, error } = await supabase.from("memories")
    .select("id, space_id, author_id, status")
    .eq("id", memoryId).eq("author_id", userId).maybeSingle();
  return error ? null : data;
}
