import { NextResponse, type NextRequest } from "next/server";
import { getMemoryViewer } from "@/lib/memories/server";

type GeoapifyResult = { name?: unknown; address_line1?: unknown; formatted?: unknown; lat?: unknown; lon?: unknown };

export async function GET(request: NextRequest) {
  const viewer = await getMemoryViewer();
  if (!viewer) return NextResponse.json({ error: "Bạn cần đăng nhập vào cuốn sổ." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) return NextResponse.json({ error: "Nhập tên địa danh từ 3 đến 120 ký tự." }, { status: 400 });
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Tìm địa danh chưa được bật. Bạn vẫn có thể chọn điểm trực tiếp trên bản đồ." }, { status: 503 });
  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("lang", "vi");
    const response = await fetch(url, { headers: { "x-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: "Chưa tìm được địa danh lúc này. Hãy thử lại hoặc đặt ghim trên bản đồ." }, { status: 502 });
    const body = await response.json() as { results?: GeoapifyResult[] };
    const results = (Array.isArray(body.results) ? body.results : []).flatMap((result) => {
      const latitude = typeof result.lat === "number" ? result.lat : NaN;
      const longitude = typeof result.lon === "number" ? result.lon : NaN;
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return [];
      const label = typeof result.formatted === "string" ? result.formatted.trim() : "";
      const name = [result.name, result.address_line1, result.formatted].find((value): value is string => typeof value === "string" && !!value.trim())?.trim().slice(0, 120) ?? "";
      return name ? [{ name, label: label || name, latitude, longitude }] : [];
    });
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Không kết nối được dịch vụ tìm địa danh. Hãy thử lại hoặc đặt ghim trên bản đồ." }, { status: 502 });
  }
}
