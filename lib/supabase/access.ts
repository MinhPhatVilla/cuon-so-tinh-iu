import { getSupabaseConfig } from "./config";
import { createClient } from "./server";

export async function getVerifiedViewer() {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return null;
  return {
    supabase,
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
}
