import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/lib/auth/request";
import { getMemoryViewer } from "@/lib/memories/server";
import { parseLetter } from "@/lib/garden/validation";
import { hasImageSignature } from "@/lib/memories/validation";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 3 * 1024 * 1024) return NextResponse.json({ error: "Ảnh thư quá lớn. Tối đa 2 MB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Không đọc được thư. Hãy thử lại." }, { status: 400 }); }
  const letter = parseLetter({ title: form.get("title"), body: form.get("body"), opensOn: form.get("opensOn") });
  if (!letter) return NextResponse.json({ error: "Kiểm tra tiêu đề, nội dung và chọn ngày mở trong tương lai." }, { status: 400 });
  const photo = form.get("photo");
  if (photo !== null && (!(photo instanceof File) || photo.type !== "image/webp" || photo.size === 0
    || photo.size > 2 * 1024 * 1024 || !await hasImageSignature(photo, "webp"))) {
    return NextResponse.json({ error: "Ảnh thư cần là WebP dưới 2 MB." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const path = `${viewer.spaceId}/${viewer.id}/${id}.webp`;
  const bucket = viewer.supabase.storage.from("future-letter-photos");
  if (photo instanceof File) {
    const { error } = await bucket.upload(path, await photo.arrayBuffer(), { contentType: "image/webp", upsert: false });
    if (error) return NextResponse.json({ error: "Chưa tải được ảnh thư. Hãy thử lại." }, { status: 500 });
  }
  const { data: savedId, error } = await viewer.supabase.rpc("create_future_letter", {
    p_letter_id: id, p_title: letter.title, p_body: letter.body,
    p_opens_on: letter.opensOn, p_has_photo: photo instanceof File,
  });
  if (error || savedId !== id) {
    if (photo instanceof File) await bucket.remove([path]);
    return NextResponse.json({ error: "Chưa gửi được thư. Kiểm tra người ấy đã vào sổ và thử lại." }, { status: 400 });
  }
  return NextResponse.json({ id }, { headers: { "Cache-Control": "private, no-store" } });
}
