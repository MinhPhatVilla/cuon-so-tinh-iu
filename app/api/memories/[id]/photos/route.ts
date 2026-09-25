import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer, getMemoryOwnedBy, cleanOrQueueOrphanPhotos } from "@/lib/memories/server";
import { hasImageSignature, imageExtension, isUuid } from "@/lib/memories/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Kỷ niệm không hợp lệ." }, { status: 400 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const memory = await getMemoryOwnedBy(viewer.supabase, id, viewer.id);
  if (!memory || memory.space_id !== viewer.spaceId) return NextResponse.json({ error: "Bạn không thể tải ảnh cho kỷ niệm này." }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 11 * 1024 * 1024) return NextResponse.json({ error: "Ảnh quá lớn. Tối đa 8 MB mỗi ảnh." }, { status: 413 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Không đọc được ảnh. Hãy thử lại." }, { status: 400 }); }
  const original = form.get("original");
  const display = form.get("display");
  const photoId = form.get("photoId");
  if (!isUuid(photoId)) return NextResponse.json({ error: "Mã ảnh không hợp lệ." }, { status: 400 });
  if (!(original instanceof File) || !(display instanceof File)) return NextResponse.json({ error: "Hãy chọn một ảnh hợp lệ." }, { status: 400 });
  const extension = imageExtension(original);
  if (!extension || original.size === 0 || original.size > 8 * 1024 * 1024 || display.size === 0 || display.size > 2 * 1024 * 1024
    || display.type !== "image/webp" || !await hasImageSignature(original, extension) || !await hasImageSignature(display, "webp")) {
    return NextResponse.json({ error: "Chỉ nhận JPEG, PNG, WebP hoặc HEIC/HEIF dưới 8 MB. Hãy chọn lại ảnh." }, { status: 400 });
  }
  const { data: alreadySaved, error: savedError } = await viewer.supabase.from("photos")
    .select("id,memory_id,created_by").eq("id", photoId).maybeSingle();
  if (savedError) return NextResponse.json({ error: "Không kiểm tra được ảnh. Hãy thử lại." }, { status: 500 });
  if (alreadySaved) {
    if (alreadySaved.memory_id === id && alreadySaved.created_by === viewer.id) return NextResponse.json({ id: photoId }, { headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "Mã ảnh đã được dùng." }, { status: 409 });
  }
  const { data: existing, error: countError } = await viewer.supabase.from("photos")
    .select("sort_order").eq("memory_id", id);
  if (countError || !existing) return NextResponse.json({ error: "Không kiểm tra được số ảnh. Hãy thử lại." }, { status: 500 });
  if (existing.length >= 8) return NextResponse.json({ error: "Mỗi kỷ niệm có tối đa 8 ảnh." }, { status: 400 });
  const used = new Set(existing.map((photo) => photo.sort_order));
  const sortOrder = Array.from({ length: 8 }, (_, index) => index).find((index) => !used.has(index));
  if (sortOrder === undefined) return NextResponse.json({ error: "Kỷ niệm đã đủ 8 ảnh." }, { status: 400 });

  const prefix = `${viewer.spaceId}/${viewer.id}/${id}/${photoId}`;
  const originalPath = `${prefix}/original.${extension}`;
  const displayPath = `${prefix}/display.webp`;
  const bucket = viewer.supabase.storage.from("couple-photos");
  await bucket.remove([originalPath, displayPath]);
  const originalBytes = await original.arrayBuffer();
  const displayBytes = await display.arrayBuffer();
  const originalMime = extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "heic" ? "image/heic" : "image/heif";
  const { error: originalError } = await bucket.upload(originalPath, originalBytes, { contentType: originalMime, upsert: false });
  if (originalError) return NextResponse.json({ error: "Chưa tải được ảnh gốc. Hãy thử lại." }, { status: 500 });
  const { error: displayError } = await bucket.upload(displayPath, displayBytes, { contentType: "image/webp", upsert: false });
  if (displayError) {
    await cleanOrQueueOrphanPhotos(viewer.supabase, [originalPath]);
    return NextResponse.json({ error: "Chưa tạo được ảnh hiển thị. Hãy thử lại." }, { status: 500 });
  }
  const { error: attachError } = await viewer.supabase.rpc("attach_memory_photo", {
    p_memory_id: id,
    p_photo_id: photoId,
    p_extension: extension,
    p_sort_order: sortOrder,
  });
  if (attachError) {
    await cleanOrQueueOrphanPhotos(viewer.supabase, [originalPath, displayPath]);
    return NextResponse.json({ error: "Chưa gắn được ảnh vào kỷ niệm. Hãy thử lại." }, { status: 500 });
  }
  return NextResponse.json({ id: photoId }, { headers: { "Cache-Control": "private, no-store" } });
}
