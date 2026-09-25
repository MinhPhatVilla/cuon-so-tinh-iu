import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer, cleanPendingPhotos } from "@/lib/memories/server";
import { isUuid } from "@/lib/memories/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });
  const viewer = await getMemoryViewer();
  if (!viewer) return new NextResponse(null, { status: 401 });
  const { data: photo, error } = await viewer.supabase.from("photos")
    .select("display_path").eq("id", id).maybeSingle();
  if (error || !photo) return new NextResponse(null, { status: 404 });
  const { data: image, error: imageError } = await viewer.supabase.storage.from("couple-photos")
    .download(photo.display_path, {}, { cache: "no-store" });
  if (imageError || !image) return new NextResponse(null, { status: 404 });
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ảnh không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const { error } = await viewer.supabase.rpc("remove_memory_photo", { p_photo_id: id });
  if (error) return NextResponse.json({ error: "Chưa xóa được ảnh. Kỷ niệm đã đăng phải giữ ít nhất một ảnh." }, { status: 400 });
  await cleanPendingPhotos(viewer.supabase);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
