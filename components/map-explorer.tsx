"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ImageIcon, MapPin, Navigation2, Route, Search, X } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { journeyCoordinates, type MemoryPlace } from "@/lib/map/places";

const mapStyle = "https://tiles.openfreemap.org/styles/liberty";

function prefersLessMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MapExplorer({ places, focusMemoryId }: { places: MemoryPlace[]; focusMemoryId?: string }) {
  const pinned = useMemo(() => places.filter((place) => place.latitude !== null && place.longitude !== null), [places]);
  const routePoints = useMemo(() => journeyCoordinates(places), [places]);
  const initialPlace = places.find((place) => place.visits.some((visit) => visit.id === focusMemoryId)) ?? places[0];
  const [selectedKey, setSelectedKey] = useState(initialPlace.key);
  const [showRoute, setShowRoute] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<{ marker: Marker; element: HTMLButtonElement; key: string }[]>([]);
  const lastCameraKey = useRef(initialPlace.key);
  const selected = places.find((place) => place.key === selectedKey) ?? places[0];
  const visiblePlaces = places.filter((place) => `${place.name} ${place.visits.map((visit) => visit.title).join(" ")}`.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN")));

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers: Marker[] = [];
    async function setup() {
      try {
        const { Map, Marker, NavigationControl, LngLatBounds } = await import("maplibre-gl");
        if (cancelled || !mapContainer.current) return;
        map = new Map({ container: mapContainer.current, style: mapStyle, center: [106.2, 16.3], zoom: 4.5,
          cooperativeGestures: true, maxZoom: 17 });
        mapRef.current = map;
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (cancelled || !map) return;
          if (routePoints.length > 1) {
            map.addSource("memory-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routePoints } } });
            map.addLayer({ id: "memory-route-line", type: "line", source: "memory-route",
              paint: { "line-color": "#ad6c91", "line-width": 3, "line-opacity": .88, "line-dasharray": [2, 1.5] },
              layout: { visibility: showRoute ? "visible" : "none" } });
          }
          const focused = pinned.find((place) => place.visits.some((visit) => visit.id === focusMemoryId));
          if (focused && focused.latitude !== null && focused.longitude !== null) {
            const camera = { center: [focused.longitude, focused.latitude] as [number, number], zoom: 12 };
            if (prefersLessMotion()) map.jumpTo(camera); else map.flyTo({ ...camera, speed: 1.1, essential: false });
            lastCameraKey.current = focused.key;
          } else if (pinned.length === 1) {
            map.jumpTo({ center: [pinned[0].longitude!, pinned[0].latitude!], zoom: 11 });
            lastCameraKey.current = selectedKey;
          } else if (pinned.length > 1) {
            const bounds = new LngLatBounds();
            for (const place of pinned) bounds.extend([place.longitude!, place.latitude!]);
            map.fitBounds(bounds, { padding: 58, maxZoom: 10, duration: 0 });
            lastCameraKey.current = selectedKey;
          }
          setStatus("ready");
        });
        map.on("error", () => { if (!map?.isStyleLoaded()) setStatus("error"); });
        for (const place of pinned) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = `memory-map-pin${place.key === selectedKey ? " is-active" : ""}`;
          element.textContent = String(place.visits.length);
          element.setAttribute("aria-label", `${place.name}, ${place.visits.length} lần ghé thăm`);
          element.addEventListener("click", () => setSelectedKey(place.key));
          const marker = new Marker({ element, anchor: "bottom" }).setLngLat([place.longitude!, place.latitude!]).addTo(map);
          markers.push(marker);
          markerRefs.current.push({ marker, element, key: place.key });
        }
      } catch { if (!cancelled) setStatus("error"); }
    }
    void setup();
    return () => { cancelled = true; for (const marker of markers) marker.remove(); markerRefs.current = []; map?.remove(); mapRef.current = null; };
    // Place data is stable for this server render; retry intentionally creates a fresh map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, pinned, routePoints, focusMemoryId, retry]);

  useEffect(() => {
    for (const marker of markerRefs.current) marker.element.classList.toggle("is-active", marker.key === selectedKey);
    const map = mapRef.current;
    const place = places.find((item) => item.key === selectedKey);
    if (status !== "ready" || !map || !place || place.latitude === null || place.longitude === null || lastCameraKey.current === selectedKey) return;
    lastCameraKey.current = selectedKey;
    const camera = { center: [place.longitude, place.latitude] as [number, number], zoom: Math.min(13, Math.max(map.getZoom(), 11)) };
    if (prefersLessMotion()) map.jumpTo(camera); else map.flyTo({ ...camera, speed: 1.1, essential: false });
  }, [selectedKey, places, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status === "ready" && map?.getLayer("memory-route-line")) map.setLayoutProperty("memory-route-line", "visibility", showRoute ? "visible" : "none");
  }, [showRoute, status]);

  function showAll() {
    const map = mapRef.current;
    if (!map || pinned.length === 0) return;
    if (pinned.length === 1) { map.jumpTo({ center: [pinned[0].longitude!, pinned[0].latitude!], zoom: 11 }); return; }
    const west = Math.min(...pinned.map((place) => place.longitude!));
    const east = Math.max(...pinned.map((place) => place.longitude!));
    const south = Math.min(...pinned.map((place) => place.latitude!));
    const north = Math.max(...pinned.map((place) => place.latitude!));
    map.fitBounds([[west, south], [east, north]], { padding: 58, maxZoom: 10, duration: prefersLessMotion() ? 0 : 600 });
  }

  function focusSelected() {
    const map = mapRef.current;
    if (!map || selected.latitude === null || selected.longitude === null) return;
    const camera = { center: [selected.longitude, selected.latitude] as [number, number], zoom: Math.min(13, Math.max(map.getZoom(), 11)) };
    if (prefersLessMotion()) map.jumpTo(camera); else map.flyTo({ ...camera, speed: 1.1, essential: false });
  }

  return <div className="memory-map-layout">
    <section className="memory-map-visual" aria-label="Bản đồ các nơi đã đi">
      <div ref={mapContainer} className="memory-map-canvas" />
      {status !== "ready" && <div className="memory-map-status" role="status">{status === "loading" ? "Đang mở bản đồ..." : <><span>Chưa tải được bản đồ. Danh sách địa điểm vẫn xem được.</span><button className="button button-soft" type="button" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Thử lại</button></>}</div>}
      <div className="memory-map-controls"><button className="button button-soft" type="button" disabled={status !== "ready" || pinned.length === 0} onClick={showAll}>Xem tất cả ghim</button>{routePoints.length > 1 && <button className="button button-soft" type="button" aria-pressed={showRoute} onClick={() => setShowRoute((value) => !value)}><Route size={16} /> {showRoute ? "Ẩn nét hành trình" : "Hiện nét hành trình"}</button>}</div>
      <p className="memory-map-caption">Nét nối theo thứ tự ngày lưu, không biểu thị đường đi thực tế. Bản đồ nền: <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.</p>
    </section>
    <aside className="memory-map-sidebar" aria-label="Địa điểm và các lần ghé thăm">
      <div className="paper-card memory-map-selected"><p className="eyebrow">NƠI ĐANG XEM</p><h2>{selected.name}</h2><p>{selected.visits.length} {selected.visits.length === 1 ? "kỷ niệm" : "lần ghé thăm"}{selected.latitude === null ? " · Chưa có tọa độ" : ""}</p>{selected.latitude !== null && <button className="text-link" type="button" onClick={focusSelected}><Navigation2 size={16} /> Đưa bản đồ tới đây</button>}
        <div className="memory-map-visits">{selected.visits.map((visit) => <Link className="memory-map-visit" href={`/memories/${visit.id}`} key={visit.id}>
          <span className="memory-map-thumb">{visit.coverId ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${visit.coverId}`} alt="" loading="lazy" />
          </> : <ImageIcon size={20} />}</span>
          <span><strong>{visit.title}</strong><small><CalendarDays size={13} /> {visit.date.split("-").reverse().join("/")}</small></span>
        </Link>)}</div>
      </div>
      <div className="paper-card memory-map-places"><h2>Các nơi đã lưu</h2><label className="memory-map-search" htmlFor="saved-place-search"><Search size={17} /><input id="saved-place-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong nơi đã lưu" />{search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch("")}><X size={16} /></button>}</label>
        <div className="memory-map-place-list">{visiblePlaces.length ? visiblePlaces.map((place) => <button className={`memory-map-place-button${place.key === selectedKey ? " is-selected" : ""}`} type="button" key={place.key} onClick={() => setSelectedKey(place.key)}><MapPin size={17} /><span><strong>{place.name}</strong><small>{place.visits.length} lần · {place.latitude === null ? "chưa ghim" : place.visits[0].date.split("-").reverse().join("/")}</small></span></button>) : <p className="memory-map-no-results">Không tìm thấy nơi nào đã lưu.</p>}</div>
      </div>
    </aside>
  </div>;
}
