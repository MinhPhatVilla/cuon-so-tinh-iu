import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftKind } from "./validation";

export type Gift = { id: string; senderId: string; recipientId: string; kind: GiftKind; message: string; createdAt: string };
export type LetterEnvelope = { id: string; senderId: string; recipientId: string; opensOn: string; createdAt: string };

export async function getGarden(supabase: SupabaseClient, spaceId: string) {
  const [giftsResult, lettersResult, membersResult] = await Promise.all([
    supabase.from("gifts").select("id,sender_id,recipient_id,kind,message,created_at")
      .eq("space_id", spaceId).order("created_at", { ascending: false }).limit(100),
    supabase.from("future_letters").select("id,sender_id,recipient_id,opens_on,created_at")
      .eq("space_id", spaceId).order("created_at", { ascending: false }).limit(100),
    supabase.from("couple_members").select("user_id").eq("space_id", spaceId),
  ]);
  if (giftsResult.error || lettersResult.error || membersResult.error) return { error: true as const, gifts: [], letters: [], hasPartner: false };
  return {
    error: false as const,
    hasPartner: (membersResult.data?.length ?? 0) === 2,
    gifts: (giftsResult.data ?? []).map((row): Gift => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, kind: row.kind, message: row.message, createdAt: row.created_at })),
    letters: (lettersResult.data ?? []).map((row): LetterEnvelope => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, opensOn: row.opens_on, createdAt: row.created_at })),
  };
}
