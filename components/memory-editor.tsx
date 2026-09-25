"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Camera, MapPin, Plus, Trash2 } from "lucide-react";
import type { MemoryCard } from "@/lib/memories/queries";
import { PlacePicker } from "@/components/place-picker";

type QueuedPhoto = { key: string; file: File; url: string; progress: number; status: "ready" | "preparing" | "uploading" | "saving" | "done" | "error" };

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function responseJson(response: Response): Promise<{ id?: string; error?: string }> {
  try { return await response.json(); } catch { return { error: "Máy chủ chưa trả lời. Hãy thử lại." }; }
}

async function makeDisplay(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [maxSize, quality] of [[1600, .82], [1300, .75], [1100, .68], [900, .62]]) {
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Thiết bị không thể xử lý ảnh này.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob?.type === "image/webp" && blob.size > 0 && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error("Ảnh hiển thị vẫn quá lớn. Hãy chọn ảnh khác.");
  } finally { bitmap.close(); }
}

function uploadPhoto(memoryId: string, photo: QueuedPhoto, display: Blob, onProgress: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("photoId", photo.key);
    form.append("original", photo.file, photo.file.name);
    form.append("display", display, "display.webp");
    xhr.open("POST", `/api/memories/${memoryId}/photos`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100))); };
    xhr.onerror = () => reject(new Error("Mạng bị gián đoạn khi gửi ảnh. Hãy thử lại."));
    xhr.onabort = () => reject(new Error("Đã dừng tải ảnh."));
    xhr.onload = () => {
      let data: { id?: string; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.id) resolve(data.id);
      else reject(new Error(data.error ?? "Chưa lưu được ảnh. Hãy thử lại."));
    };
    xhr.send(form);
  });
}

export function MemoryEditor({ initial, searchEnabled = false }: { initial?: MemoryCard; searchEnabled?: boolean }) {
  const router = useRouter();
  const [memoryId, setMemoryId] = useState(initial?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [story, setStory] = useState(initial?.story ?? "");
  const [date, setDate] = useState(initial?.date ?? localToday());
  const [placeName, setPlaceName] = useState(initial?.place?.name ?? "");
  const [latitude, setLatitude] = useState(initial?.place?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initial?.place?.longitude?.toString() ?? "");
  const [existing, setExisting] = useState(initial?.photos ?? []);
  const [queued, setQueued] = useState<QueuedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const urls = useRef(new Set<string>());

  useEffect(() => () => { for (const url of urls.current) URL.revokeObjectURL(url); }, []);

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (existing.length + queued.length + files.length > 8) { setMessage("Mỗi kỷ niệm có tối đa 8 ảnh."); return; }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
      && !(!file.type && /\.(heic|heif)$/i.test(file.name)) || file.size === 0 || file.size > 8 * 1024 * 1024)) {
      setMessage("Chỉ chọn JPEG, PNG, WebP hoặc HEIC/HEIF dưới 8 MB mỗi ảnh."); return;
    }
    const next = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { key: crypto.randomUUID(), file, url, progress: 0, status: "ready" as const };
    });
    setQueued((current) => [...current, ...next]);
    setMessage("");
  }

  function removeQueued(key: string) {
    setQueued((current) => {
      const photo = current.find((item) => item.key === key);
      if (photo) { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); }
      return current.filter((item) => item.key !== key);
    });
  }

  function moveQueued(index: number, offset: number) {
    setQueued((current) => {
      const next = [...current];
      const other = index + offset;
      if (other < 0 || other >= next.length) return current;
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  function moveExisting(index: number, offset: number) {
    setExisting((current) => {
      const next = [...current];
      const other = index + offset;
      if (other < 0 || other >= next.length) return current;
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  async function removeExisting(photoId: string) {
    if (!window.confirm("Xóa ảnh này khỏi kỷ niệm?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Chưa xóa được ảnh.");
      setExisting((current) => current.filter((photo) => photo.id !== photoId));
      setMessage("Đã xóa ảnh.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa xóa được ảnh."); }
    finally { setBusy(false); }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMessage("Thiết bị này không hỗ trợ lấy vị trí."); return; }
    setLocating(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
        setMessage("Đã lấy tọa độ. Hãy nhập tên địa điểm và kiểm tra trước khi lưu.");
      },
      () => { setLocating(false); setMessage("Không lấy được vị trí. Bạn có thể tự nhập địa điểm hoặc bỏ qua."); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (initial?.status !== "published" && existing.length + queued.length === 0) { setMessage("Hãy chọn ít nhất một ảnh trước khi đăng."); return; }
    if ((latitude && !longitude) || (!latitude && longitude) || ((latitude || longitude) && !placeName.trim())) {
      setMessage("Hãy nhập tên địa điểm và đủ hai tọa độ, hoặc để trống cả hai."); return;
    }
    setBusy(true); setMessage("");
    let activeId = memoryId;
    try {
      const body = JSON.stringify({ title, story, date, placeName, latitude: latitude || null, longitude: longitude || null });
      const response = await fetch(activeId ? `/api/memories/${activeId}` : "/api/memories", {
        method: activeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" }, body,
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Chưa lưu được kỷ niệm.");
      if (!activeId) { activeId = data.id ?? ""; setMemoryId(activeId); }
      if (!activeId) throw new Error("Chưa tạo được bản nháp.");

      const uploadedIds: string[] = [];
      for (const photo of queued) {
        setQueued((current) => current.map((item) => item.key === photo.key ? { ...item, status: "preparing" } : item));
        let display: Blob;
        try { display = await makeDisplay(photo.file); }
    catch { throw new Error(`Không xử lý được ảnh ${photo.file.name} trên thiết bị này. Hãy thử ảnh JPEG, PNG hoặc WebP.`); }
        setQueued((current) => current.map((item) => item.key === photo.key ? { ...item, status: "uploading" } : item));
        try {
          const id = await uploadPhoto(activeId, photo, display, (progress) => {
            setQueued((current) => current.map((item) => item.key === photo.key ? { ...item, progress, status: progress >= 99 ? "saving" : "uploading" } : item));
          });
          uploadedIds.push(id);
          setExisting((current) => [...current, { id, sortOrder: current.length }]);
          setQueued((current) => current.filter((item) => item.key !== photo.key));
          URL.revokeObjectURL(photo.url);
          urls.current.delete(photo.url);
        } catch (error) {
          setQueued((current) => current.map((item) => item.key === photo.key ? { ...item, status: "error" } : item));
          throw error;
        }
      }

      const order = [...existing.map((photo) => photo.id), ...uploadedIds];
      if (order.length > 0) {
        const reorder = await fetch(`/api/memories/${activeId}/reorder`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoIds: order }),
        });
        const reorderData = await responseJson(reorder);
        if (!reorder.ok) throw new Error(reorderData.error ?? "Chưa lưu được thứ tự ảnh.");
      }
      if (initial?.status !== "published") {
        const publish = await fetch(`/api/memories/${activeId}/publish`, { method: "POST" });
        const publishData = await responseJson(publish);
        if (!publish.ok) throw new Error(publishData.error ?? "Chưa đăng được kỷ niệm.");
      }
      router.replace(`/memories/${activeId}`);
      router.refresh();
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Chưa lưu được kỷ niệm."} ${activeId && !initial ? "Bản nháp đã được giữ riêng để bạn thử lại." : ""}`);
    } finally { setBusy(false); }
  }

  return <form className="memory-form" onSubmit={save}>
    <section className="paper-card memory-editor-card">
      <p className="eyebrow">01 / NHỮNG BỨC ẢNH</p>
      <h2>Chọn ảnh mình muốn giữ</h2>
      <p className="editor-help">Tối đa 8 ảnh JPEG, PNG, WebP hoặc HEIC/HEIF, mỗi ảnh dưới 8 MB. Ảnh hiển thị sẽ được tạo lại để bỏ dữ liệu vị trí nhúng.</p>
      <input id="memory-files" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple onChange={addFiles} disabled={busy || existing.length + queued.length >= 8} />
      <label className="photo-picker" htmlFor="memory-files"><Camera size={22} /><span>Chọn ảnh hoặc chụp ảnh</span><small>Ảnh đầu tiên sẽ là ảnh bìa</small></label>
      {existing.length + queued.length > 0 && <div className="editor-photo-grid">
        {existing.map((photo, index) => <div className="editor-photo" key={photo.id}>
          {/* A private same-origin route serves this image without a public URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${photo.id}`} alt={`Ảnh ${index + 1} của kỷ niệm`} />
          <div className="editor-photo-actions"><span>Ảnh {index + 1}</span><button type="button" aria-label="Đưa ảnh lên trước" disabled={busy || index === 0} onClick={() => moveExisting(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label="Đưa ảnh xuống sau" disabled={busy || index === existing.length - 1} onClick={() => moveExisting(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label="Xóa ảnh" disabled={busy} onClick={() => removeExisting(photo.id)}><Trash2 size={16} /></button></div>
        </div>)}
        {queued.map((photo, index) => <div className="editor-photo" key={photo.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Ảnh vừa chọn ${index + 1}`} />
          <div className="editor-photo-actions"><span>{photo.status === "ready" ? `Ảnh mới ${index + 1}` : photo.status === "done" ? "Đã tải xong" : photo.status === "error" ? "Tải lỗi" : photo.status === "preparing" ? "Đang chuẩn bị" : "Đang tải"}</span><button type="button" aria-label="Đưa ảnh mới lên trước" disabled={busy || index === 0} onClick={() => moveQueued(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label="Đưa ảnh mới xuống sau" disabled={busy || index === queued.length - 1} onClick={() => moveQueued(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label="Bỏ ảnh vừa chọn" disabled={busy} onClick={() => removeQueued(photo.key)}><Trash2 size={16} /></button></div>
          {photo.status !== "ready" && <progress max="100" value={photo.progress} aria-label={`Tiến độ ảnh ${index + 1}`} />}
        </div>)}
      </div>}
    </section>

    <section className="paper-card memory-editor-card">
      <p className="eyebrow">02 / NGÀY VÀ CÂU CHUYỆN</p>
      <div className="memory-fields">
        <label htmlFor="memory-date">Ngày kỷ niệm</label><input id="memory-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} min="1900-01-01" max={localToday()} required disabled={busy} />
        <label htmlFor="memory-title">Tên kỷ niệm</label><input id="memory-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required disabled={busy} placeholder="Ví dụ: Chiều mưa ở Đà Lạt" />
        <label htmlFor="memory-story">Lời kể của bạn <span>(có thể để trống)</span></label><textarea id="memory-story" value={story} onChange={(event) => setStory(event.target.value)} maxLength={3000} rows={5} disabled={busy} placeholder="Hôm đó hai đứa đã..." />
      </div>
    </section>

    <section className="paper-card memory-editor-card">
      <p className="eyebrow">03 / MỘT NƠI ĐÃ ĐI QUA</p>
      <h2>Gắn địa điểm <span className="optional">nếu bạn muốn</span></h2>
      <p className="editor-help">Nhập tên nơi đã đi, rồi chọn ghim trên bản đồ, tìm địa danh hoặc điền tọa độ. Website chỉ xin quyền vị trí thiết bị khi bạn bấm nút dùng vị trí hiện tại.</p>
      <div className="memory-fields">
        <label htmlFor="place-name">Tên địa điểm</label><input id="place-name" value={placeName} onChange={(event) => setPlaceName(event.target.value)} maxLength={120} disabled={busy} placeholder="Ví dụ: Hồ Xuân Hương, Đà Lạt" />
        <button className="button button-soft location-button" type="button" disabled={busy || locating} onClick={useCurrentLocation}><MapPin size={17} /> {locating ? "Đang lấy vị trí..." : "Dùng vị trí hiện tại"}</button>
        <PlacePicker latitude={latitude} longitude={longitude} name={placeName} disabled={busy} searchEnabled={searchEnabled} onPick={(lat, lon, name) => { setLatitude(lat.toFixed(6)); setLongitude(lon.toFixed(6)); if (name) setPlaceName(name); }} onClear={() => { setLatitude(""); setLongitude(""); }} />
        <div className="coordinate-fields"><div><label htmlFor="latitude">Vĩ độ</label><input id="latitude" type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} disabled={busy} placeholder="Tùy chọn" /></div><div><label htmlFor="longitude">Kinh độ</label><input id="longitude" type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} disabled={busy} placeholder="Tùy chọn" /></div></div>
      </div>
    </section>

    {message && <p className="memory-message" role="status">{message} {memoryId && !initial && <Link href={`/memories/${memoryId}/edit`}>Mở bản nháp</Link>}</p>}
    <div className="memory-form-actions"><Link className="text-link" href={memoryId ? `/memories/${memoryId}` : "/album"}>Quay lại album</Link><button className="button button-primary" type="submit" disabled={busy}><Plus size={18} /> {busy ? "Đang lưu..." : initial?.status === "published" ? "Lưu thay đổi" : "Đăng kỷ niệm"}</button></div>
  </form>;
}
