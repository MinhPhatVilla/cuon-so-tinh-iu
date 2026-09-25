import Link from "next/link";
import { ArrowRight, CalendarDays, Flower2, Heart, MapPin, Plus } from "lucide-react";
import { MemoryArt } from "@/components/memory-art";
import { RandomDayButton } from "@/components/random-day-button";
import { getMemoryViewer } from "@/lib/memories/server";
import { getVisibleMemories } from "@/lib/memories/queries";
import { getCalendarEvents } from "@/lib/calendar/queries";
import { todayInVietnam, upcomingReminders, formatDateVi, nextOccurrence } from "@/lib/calendar/date";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const [memories, events, latestGiftResult] = await Promise.all([
    getVisibleMemories(viewer.supabase, viewer.spaceId), getCalendarEvents(viewer.supabase, viewer.spaceId),
    viewer.supabase.from("gifts").select("kind,message,sender_id").eq("space_id", viewer.spaceId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const latestGift = latestGiftResult.data;
  const latest = memories.find((memory) => memory.status === "published");
  const memoryDays = [...new Set(memories.filter((memory) => memory.status === "published").map((memory) => memory.date))];
  const today = todayInVietnam();
  const monthDay = today.slice(5);
  const onThisDay = memories.find((memory) => memory.status === "published" && memory.date.slice(5) === monthDay);
  const reminder = upcomingReminders(events, today)[0];
  const nextEvent = reminder ?? events.flatMap((event) => {
    const date = nextOccurrence(event, today);
    return date ? [{ event, date }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.event.time ?? "").localeCompare(b.event.time ?? ""))[0];
  return (
    <div className="home-grid">
      <div className="home-main">
        <header className="page-heading">
          <p className="eyebrow">CUỐN SỔ CỦA HAI ĐỨA</p>
          <h1>Những ngày mình muốn giữ mãi</h1>
          <p className="page-intro">Mỗi bức ảnh sẽ có một ngày, một nơi và câu chuyện của riêng mình.</p>
        </header>

        <div className="mobile-quick-action">
          <Link className="button button-primary" href="/memories/new"><Plus size={18} /> Thêm kỷ niệm</Link>
        </div>

        <section className="feature-card" aria-labelledby="first-memory-title">
          <div className="feature-art">
            <div className="polaroid">
              {latest?.photos[0] ? <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="home-memory-image" src={`/api/photos/${latest.photos[0].id}`} alt={`Ảnh của ${latest.title}`} />
              </> : <MemoryArt />}
              <span className="polaroid-caption">{latest?.title ?? "Ảnh đầu tiên của hai đứa ♡"}</span>
            </div>
            <span className="feature-sticker" aria-hidden="true">✿</span>
          </div>
          <div className="feature-copy">
            <p className="eyebrow">{latest ? "TRANG VỪA LƯU" : "TRANG ĐẦU TIÊN"}</p>
            <h2 id="first-memory-title">{latest?.title ?? "Cuốn sổ đang chờ kỷ niệm đầu tiên"}</h2>
            <p>{latest ? `${latest.date.split("-").reverse().join("/")}${latest.place ? ` · ${latest.place.name}` : ""}` : "Chọn một bức ảnh, ngày và câu chuyện để mở trang đầu của hai đứa."}</p>
            <Link className="button button-primary" href={latest ? `/memories/${latest.id}` : "/memories/new"}>
              {latest ? <ArrowRight size={18} /> : <Plus size={18} strokeWidth={2.2} />} {latest ? "Mở kỷ niệm" : "Thêm kỷ niệm"}
            </Link>
          </div>
        </section>

        <div className="home-actions">
          <Link className="text-link" href="/album">Mở album <ArrowRight size={17} /></Link>
          <RandomDayButton days={memoryDays} />
        </div>

        <section className="home-notes" aria-label="Những góc kỷ niệm">
          <div className="paper-card note-card">
            <span className="note-symbol note-symbol-pink"><CalendarDays size={22} /></span>
            <p className="eyebrow">HÔM NAY NĂM ẤY</p>
            <h3>{onThisDay?.title ?? "Một ngày cũ, cảm giác mới"}</h3>
            <p>{onThisDay ? <Link className="text-link" href={`/memories/${onThisDay.id}`}>Mở kỷ niệm ngày này</Link> : "Kỷ niệm đúng ngày này sẽ xuất hiện ở đây khi cuốn sổ có ảnh."}</p>
          </div>
          <div className="paper-card note-card">
            <span className="note-symbol note-symbol-lavender"><Heart size={22} /></span>
            <p className="eyebrow">HAI GÓC NHÌN</p>
            <h3>Cùng một ngày, hai câu chuyện</h3>
            <p>Mỗi người có thể lưu lại điều mình nhớ về một kỷ niệm chung.</p>
          </div>
        </section>
      </div>

      <aside className="home-aside" aria-label="Lối tắt">
        <section className="paper-card aside-card">
          <div className="aside-icon" style={{ background: "var(--pink-soft)" }}><Flower2 size={24} /></div>
          <h2>Khu vườn của hai đứa</h2>
          {latestGift ? <p>{latestGift.sender_id === viewer.id ? "Bạn đã tặng" : "Người ấy tặng bạn"} {latestGift.kind === "flower" ? "một bông hoa" : latestGift.kind === "card" ? "một tấm thiệp" : "một ngôi sao"}: “{latestGift.message}”</p> : <p>Một lời nhắn và bông hoa đầu tiên đang chờ hai đứa.</p>}
          <Link className="text-link" href="/garden">Mở khu vườn <ArrowRight size={16} /></Link>
        </section>
        <section className="paper-card aside-card">
          <div className="aside-icon aside-icon-lavender"><CalendarDays size={24} /></div>
          <h2>Lịch của hai đứa</h2>
          {nextEvent ? <><p className="aside-reminder-label">{reminder ? reminder.daysUntil === 0 ? "HÔM NAY" : `CÒN ${reminder.daysUntil} NGÀY` : "NGÀY SẮP TỚI"}</p><p className="aside-reminder-title">{nextEvent.event.title}</p><p>{formatDateVi(nextEvent.date)}{nextEvent.event.time ? ` · ${nextEvent.event.time}` : ""}</p></> : <p>Ngày kỷ niệm và kế hoạch sẽ ở cùng một nơi. Lời nhắc sắp tới sẽ hiện ở đây.</p>}
          <Link className="text-link" href={nextEvent ? `/calendar?month=${nextEvent.date.slice(0, 7)}&day=${nextEvent.date}` : "/calendar"}>Mở lịch <ArrowRight size={16} /></Link>
        </section>
        <section className="paper-card aside-card">
          <div className="aside-icon aside-icon-sage"><MapPin size={24} /></div>
          <h2>Những nơi đã đi</h2>
          <p>Mỗi chiếc ghim sẽ dẫn về những bức ảnh của chuyến đi.</p>
          <Link className="text-link" href="/map">Mở bản đồ <ArrowRight size={16} /></Link>
        </section>
        <div className="small-flower" aria-hidden="true"><span>✿</span><span>✦</span><span>✿</span></div>
      </aside>
    </div>
  );
}
