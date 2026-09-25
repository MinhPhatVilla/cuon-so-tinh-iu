import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseConfig()) redirect("/login?setup=1");

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims?.sub) redirect("/login");

  const { data: space, error: spaceError } = await supabase
    .from("couple_spaces")
    .select("id")
    .maybeSingle();

  if (spaceError) throw new Error("Không thể kiểm tra quyền vào cuốn sổ. Vui lòng thử lại.");
  if (!space) redirect("/welcome");

  return <SiteShell>{children}</SiteShell>;
}
