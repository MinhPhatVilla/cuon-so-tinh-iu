"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Flower2, Gift, LockKeyhole, Mail, RefreshCw } from "lucide-react";
import { formatDateVi, shiftDate, todayInVietnam } from "@/lib/calendar/date";
import type { Gift as GardenGift, LetterEnvelope } from "@/lib/garden/queries";
import type { GiftKind } from "@/lib/garden/validation";

const kinds: { value: GiftKind; label: string; symbol: string }[] = [
  { value: "flower", label: "Bông hoa", symbol: "✿" },
  { value: "card", label: "Tấm thiệp", symbol: "✉" },
  { value: "star", label: "Ngôi sao", symbol: "✦" },
];
type GardenData = { error: boolean; hasPartner: boolean; gifts: GardenGift[]; letters: LetterEnvelope[] };
type OpenLetter = { title: string; body: string; hasPhoto: boolean };

async function makeLetterPhoto(file: File): Promise<File> {
  if (file.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Chọn ảnh JPEG, PNG hoặc WebP dưới 8 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    for (const [size, quality] of [[1600, .82], [1300, .74], [1000, .65]]) {
      const ratio = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Thiết bị không xử lý được ảnh này.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob?.type === "image/webp" && blob.size > 0 && blob.size <= 2 * 1024 * 1024) return new File([blob], "thu-tuong-lai.webp", { type: "image/webp" });
    }
    throw new Error("Ảnh vẫn quá lớn. Hãy chọn ảnh khác.");
  } finally { bitmap.close(); }
}

export function GardenClient({ garden, userId, spaceId, today }: { garden: GardenData; userId: string; spaceId: string; today: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<GiftKind>("flower");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftPending, setGiftPending] = useState(false);
  const [giftFeedback, setGiftFeedback] = useState("");
  const [giftSuccess, setGiftSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [opensOn, setOpensOn] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [letterPending, setLetterPending] = useState(false);
  const [letterFeedback, setLetterFeedback] = useState("");
  const [opened, setOpened] = useState<Record<string, OpenLetter>>({});
  const [openPending, setOpenPending] = useState<string | null>(null);
  const [openError, setOpenError] = useState("");
  const [currentDay, setCurrentDay] = useState(today);

  useEffect(() => {
    const update = () => {
      setCurrentDay(todayInVietnam());
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [router]);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const client = createBrowserClient(url, key);
    const channel = client.channel(`garden-${spaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gifts", filter: `space_id=eq.${spaceId}` }, () => router.refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "future_letters", filter: `space_id=eq.${spaceId}` }, () => router.refresh())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [spaceId, router]);

  async function sendGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (giftPending) return;
    setGiftPending(true); setGiftFeedback(""); setGiftSuccess(false);
    try {
      const response = await fetch("/api/gifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, message: giftMessage }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Chưa gửi được quà.");
      setGiftMessage(""); setGiftSuccess(true); setGiftFeedback("Món quà đã đến khu vườn của hai đứa ♡");
      router.refresh();
      window.setTimeout(() => setGiftSuccess(false), 2200);
    } catch (error) { setGiftFeedback(error instanceof Error ? error.message : "Chưa gửi được quà."); }
    finally { setGiftPending(false); }
  }

  async function sendLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (letterPending) return;
    setLetterPending(true); setLetterFeedback("");
    try {
      const form = new FormData();
      form.set("title", title); form.set("body", body); form.set("opensOn", opensOn);
      if (photo) form.set("photo", await makeLetterPhoto(photo));
      const response = await fetch("/api/letters", { method: "POST", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Chưa gửi được thư.");
      setTitle(""); setBody(""); setOpensOn(""); setPhoto(null);
      const input = document.getElementById("future-letter-photo") as HTMLInputElement | null;
      if (input) input.value = "";
      setLetterFeedback("Đã niêm phong thư. Đến ngày hẹn, hai đứa sẽ mở được.");
      router.refresh();
    } catch (error) { setLetterFeedback(error instanceof Error ? error.message : "Chưa gửi được thư."); }
    finally { setLetterPending(false); }
  }

  async function openLetter(id: string) {
    if (openPending) return;
    setOpenPending(id); setOpenError("");
    try {
      const response = await fetch(`/api/letters/${id}`, { cache: "no-store" });
      const result = await response.json() as OpenLetter & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Chưa mở được thư.");
      setOpened((old) => ({ ...old, [id]: { title: result.title, body: result.body, hasPhoto: result.hasPhoto } }));
    } catch (error) { setOpenError(error instanceof Error ? error.message : "Chưa mở được thư."); }
    finally { setOpenPending(null); }
  }

  return <div className="section-page garden-page">
    <header className="page-heading garden-heading"><p className="eyebrow">MỘT CHÚT DỊU DÀNG</p><h1>Khu vườn của hai đứa</h1><p className="page-intro">Tặng nhau một điều nhỏ hôm nay, cất một lá thư cho ngày mai.</p></header>
    {garden.error ? <div className="paper-card garden-notice" role="alert">Chưa tải được khu vườn. <button className="text-link" onClick={() => router.refresh()}><RefreshCw size={15} /> Thử lại</button></div> : <>
      {!garden.hasPartner && <p className="paper-card garden-notice">Mời người ấy vào cuốn sổ ở Cài đặt để bắt đầu gửi quà và thư.</p>}
      <div className="garden-grid">
        <section className="paper-card garden-compose" aria-labelledby="gift-heading"><span className="garden-section-icon"><Gift size={24} /></span><p className="eyebrow">QUÀ HÔM NAY</p><h2 id="gift-heading">Gửi một chút thương</h2><p>Chọn món quà và để lại lời nhắn. Món quà sẽ ở lại trong khu vườn chung.</p>
          <form onSubmit={sendGift} className="garden-form">
            <fieldset className="garden-gift-choices" disabled={!garden.hasPartner || giftPending}><legend>Chọn món quà</legend>{kinds.map((item) => <label key={item.value} className={`garden-gift-choice ${kind === item.value ? "is-selected" : ""}`}><input type="radio" name="gift-kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} /><span aria-hidden="true">{item.symbol}</span><strong>{item.label}</strong></label>)}</fieldset>
            <label htmlFor="gift-message">Lời nhắn</label><textarea id="gift-message" value={giftMessage} onChange={(event) => setGiftMessage(event.target.value)} maxLength={500} rows={3} required disabled={!garden.hasPartner || giftPending} placeholder="Hôm nay nhớ cậu nhiều một chút…" />
            <div className="garden-form-footer"><small>{giftMessage.length}/500</small><button className="button button-primary" disabled={!garden.hasPartner || giftPending || !giftMessage.trim()} type="submit">{giftPending ? "Đang gửi…" : "Tặng người ấy"} <ArrowRight size={17} /></button></div>
            {giftFeedback && <p className="garden-feedback" role="status">{giftFeedback}</p>}
          </form>{giftSuccess && <div className="garden-bloom" aria-hidden="true"><span>✿</span><span>✿</span><span>✦</span><span>✿</span></div>}
        </section>
        <section className="paper-card garden-compose garden-letter-compose" aria-labelledby="letter-heading"><span className="garden-section-icon garden-section-lavender"><Mail size={24} /></span><p className="eyebrow">BƯU ĐIỆN TƯƠNG LAI</p><h2 id="letter-heading">Viết cho ngày sẽ tới</h2><p>Hẹn ngày mở. Trước ngày đó, lá thư sẽ nằm yên trong phong bì.</p>
          <form className="garden-form" onSubmit={sendLetter}>
            <label htmlFor="letter-title">Tên lá thư</label><input id="letter-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required disabled={!garden.hasPartner || letterPending} placeholder="Gửi chúng mình của một ngày nào đó" />
            <label htmlFor="letter-date">Ngày mở thư</label><input id="letter-date" type="date" min={shiftDate(currentDay, 1)} value={opensOn} onChange={(event) => setOpensOn(event.target.value)} required disabled={!garden.hasPartner || letterPending} />
            <label htmlFor="letter-body">Điều muốn nói</label><textarea id="letter-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={5} required disabled={!garden.hasPartner || letterPending} placeholder="Khi mở lá thư này, mình mong…" />
            <label htmlFor="future-letter-photo">Ảnh kèm theo (nếu muốn)</label><input id="future-letter-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} disabled={!garden.hasPartner || letterPending} /><small>JPEG, PNG hoặc WebP tối đa 8 MB; ảnh sẽ được nén riêng cho lá thư.</small>
            <div className="garden-form-footer"><small>{body.length}/5000</small><button className="button button-primary" disabled={!garden.hasPartner || letterPending || !title.trim() || !body.trim() || !opensOn} type="submit">{letterPending ? "Đang niêm phong…" : "Niêm phong thư"} <LockKeyhole size={16} /></button></div>
            {letterFeedback && <p className="garden-feedback" role="status">{letterFeedback}</p>}
          </form>
        </section>
      </div>
      <section className="garden-section" aria-labelledby="garden-gifts-heading"><div className="garden-section-heading"><div><p className="eyebrow">NHỮNG ĐIỀU ĐÃ TẶNG</p><h2 id="garden-gifts-heading">Quà trong vườn</h2></div><Flower2 size={29} /></div>
        {garden.gifts.length === 0 ? <div className="paper-card garden-empty"><Flower2 size={33} /><h3>Chưa có món quà nào</h3><p>Một bông hoa và vài lời thật lòng sẽ mở khu vườn đầu tiên.</p></div> : <div className="garden-gift-grid">{garden.gifts.map((gift) => {
          const item = kinds.find((entry) => entry.value === gift.kind) ?? kinds[0];
          return <article className={`paper-card garden-gift-card garden-gift-${gift.kind}`} key={gift.id}><span className="garden-gift-symbol" aria-hidden="true">{item.symbol}</span><span className="garden-gift-tag">{gift.senderId === userId ? "Bạn đã tặng" : "Người ấy tặng bạn"} · {item.label}</span><p>{gift.message}</p><time dateTime={gift.createdAt}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(gift.createdAt))}</time></article>;
        })}</div>}
      </section>
      <section className="garden-section" aria-labelledby="future-letters-heading"><div className="garden-section-heading"><div><p className="eyebrow">NGĂN KÉO BÍ MẬT</p><h2 id="future-letters-heading">Những lá thư hẹn ngày</h2></div><Mail size={29} /></div>
        {garden.letters.length === 0 ? <div className="paper-card garden-empty"><Mail size={32} /><h3>Ngăn kéo còn trống</h3><p>Viết một lá thư và chọn một ngày trong tương lai để hai đứa cùng mở.</p></div> : <div className="garden-envelope-grid">{garden.letters.map((letter) => {
          const locked = letter.opensOn > currentDay;
          return <article className={`paper-card garden-envelope ${locked ? "is-locked" : "is-ready"}`} key={letter.id}><span className="garden-envelope-mark">{locked ? <LockKeyhole size={24} /> : <Mail size={25} />}</span><small>{letter.senderId === userId ? "BẠN ĐÃ GỬI" : "THƯ GỬI BẠN"}</small><h3>{locked ? "Một lá thư đang chờ" : opened[letter.id]?.title ?? "Lá thư đã đến ngày mở"}</h3><p>Hẹn mở: <strong>{formatDateVi(letter.opensOn)}</strong></p>
            {locked ? <span className="garden-locked-note">Nội dung đang được giữ kín ♡</span> : opened[letter.id] ? <div className="garden-opened-letter"><p>{opened[letter.id].body}</p>{opened[letter.id].hasPhoto && <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/letters/${letter.id}/photo`} alt={`Ảnh kèm theo thư ${opened[letter.id].title}`} />
            </>}</div> : <button className="button button-soft" onClick={() => void openLetter(letter.id)} disabled={openPending === letter.id}>{openPending === letter.id ? "Đang mở…" : "Mở lá thư"} <ArrowRight size={16} /></button>}
          </article>;
        })}</div>}{openError && <p className="garden-feedback" role="alert">{openError}</p>}
      </section>
    </>}
  </div>;
}
