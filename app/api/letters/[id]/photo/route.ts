import { NextResponse, type NextRequest } from "next/server";
import { getMemoryViewer } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });
  const viewer = await getMemoryViewer();
  if (!viewer) return new NextResponse(null, { status: 401 });
  const { data, error } = await viewer.supabase.rpc("read_future_letter", { p_letter_id: id });
  const path = !error && Array.isArray(data) ? data[0]?.photo_path : null;
  if (!path) return new NextResponse(null, { status: 404 });
  const { data: image, error: imageError } = await viewer.supabase.storage.from("future-letter-photos")
    .download(path, {}, { cache: "no-store" });
  if (imageError || !image) return new NextResponse(null, { status: 404 });
  return new NextResponse(image, { headers: {
    "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}
