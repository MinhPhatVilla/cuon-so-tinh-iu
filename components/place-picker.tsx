"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type SearchResult = { name: string; label: string; latitude: number; longitude: number };
type Props = {
  latitude: string;
  longitude: string;
  name: string;
  disabled: boolean;
  searchEnabled: boolean;
  onPick: (latitude: number, longitude: number, name?: string) => void;
  onClear: () => void;
};

function validPoint(latitude: string, longitude: string): [number, number] | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180 ? [lon, lat] : null;
}

export function PlacePicker({ latitude, longitude, name, disabled, searchEnabled, onPick, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerVisible = useRef(false);
  const onPickRef = useRef(onPick);
  const disabledRef = useRef(disabled);
  useEffect(() => { onPickRef.current = onPick; disabledRef.current = disabled; }, [onPick, disabled]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let marker: Marker | null = null;
    async function setup() {
      try {
        const { Map, Marker, NavigationControl } = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        const point = validPoint(latitude, longitude);
        map = new Map({ container: containerRef.current, style: "https://tiles.openfreemap.org/styles/liberty",
          center: point ?? [106.2, 16.3], zoom: point ? 12 : 4.5,
          cooperativeGestures: true, maxZoom: 17 });
        mapRef.current = map;
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        marker = new Marker({ color: "#a35b83", draggable: true }).setLngLat(point ?? [106.2, 16.3]);
        markerRef.current = marker;
        if (point) { marker.addTo(map); markerVisible.current = true; }
        marker.on("dragend", () => {
          if (disabledRef.current || !marker) return;
          const position = marker.getLngLat();
          onPickRef.current(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
          setMessage("Đã dời ghim. Kiểm tra tên địa điểm trước khi lưu.");
        });
        map.on("click", (event) => {
          if (disabledRef.current || !map || !marker) return;
          marker.setLngLat(event.lngLat);
          if (!markerVisible.current) { marker.addTo(map); markerVisible.current = true; }
          onPickRef.current(Number(event.lngLat.lat.toFixed(6)), Number(event.lngLat.lng.toFixed(6)));
          setMessage("Đã đặt ghim. Hãy nhập hoặc kiểm tra tên địa điểm trước khi lưu.");
        });
        map.on("load", () => { if (!cancelled) setMapStatus("ready"); });
        map.on("error", () => { if (!map?.isStyleLoaded()) setMapStatus("error"); });
      } catch { if (!cancelled) setMapStatus("error"); }
    }
    void setup();
    return () => { cancelled = true; marker?.remove(); map?.remove(); markerRef.current = null; mapRef.current = null; markerVisible.current = false; };
    // Reopening or retrying intentionally creates a new map; coordinate updates use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retry]);

  useEffect(() => {
    if (!open || !mapRef.current || !markerRef.current) return;
    const point = validPoint(latitude, longitude);
    if (!point) { markerRef.current.remove(); markerVisible.current = false; return; }
    markerRef.current.setLngLat(point);
    if (!markerVisible.current) { markerRef.current.addTo(mapRef.current); markerVisible.current = true; }
    if (mapStatus === "ready" && !mapRef.current.getBounds().contains(point)) {
      const camera = { center: point, zoom: 12 };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) mapRef.current.jumpTo(camera);
      else mapRef.current.flyTo({ ...camera, essential: false, speed: 1.2 });
    }
  }, [open, latitude, longitude, mapStatus]);

  async function searchPlace() {
    if (disabled || searching) return;
    setSearching(true); setResults([]); setMessage("");
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const data = await response.json() as { results?: SearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chưa tìm được địa danh.");
      const next = Array.isArray(data.results) ? data.results : [];
      setResults(next);
      if (!next.length) setMessage("Không tìm thấy nơi phù hợp. Bạn có thể đặt ghim trực tiếp trên bản đồ.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Chưa tìm được địa danh."); }
    finally { setSearching(false); }
  }

  function selectResult(result: SearchResult) {
    onPick(result.latitude, result.longitude, result.name);
    setResults([]); setQuery(result.label);
    setMessage("Đã chọn địa danh. Kiểm tra vị trí ghim và tên trước khi lưu.");
    const map = mapRef.current;
    if (map) {
      const camera = { center: [result.longitude, result.latitude] as [number, number], zoom: 13 };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) map.jumpTo(camera);
      else map.flyTo({ ...camera, essential: false, speed: 1.2 });
    }
  }

  return <div className="place-picker">
    <button className="button button-soft" type="button" disabled={disabled} aria-expanded={open} onClick={() => { setOpen((value) => !value); setMapStatus("loading"); }}><MapPin size={17} /> {open ? "Đóng bản đồ chọn ghim" : "Chọn trên bản đồ"}</button>
    {open && <div className="place-picker-panel">
      <p className="place-picker-help">Chạm bản đồ hoặc kéo ghim đến đúng nơi. Tên địa điểm và tọa độ chỉ được lưu khi bạn bấm <strong>Đăng kỷ niệm</strong>.</p>
      {searchEnabled ? <div className="place-search-form"><label htmlFor="place-search">Tìm địa danh</label><div><input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchPlace(); } }} minLength={3} maxLength={120} placeholder="Ví dụ: Hồ Xuân Hương, Đà Lạt" disabled={disabled || searching} /><button className="button button-primary" type="button" onClick={() => void searchPlace()} disabled={disabled || searching || query.trim().length < 3}><Search size={16} /> {searching ? "Đang tìm" : "Tìm"}</button></div><p className="place-search-disclosure">Từ khóa được gửi tới Geoapify khi bạn bấm Tìm. Hãy kiểm tra kết quả trước khi lưu.</p></div> : <p className="place-search-unavailable">Hiện bạn có thể chạm bản đồ hoặc kéo ghim để chọn vị trí.</p>}
      {results.length > 0 && <div className="place-search-results" aria-label="Địa danh tìm thấy">{results.map((result, index) => <button type="button" key={`${result.latitude}-${result.longitude}-${index}`} onClick={() => selectResult(result)}><MapPin size={16} /><span><strong>{result.name}</strong><small>{result.label}</small></span></button>)}</div>}
      <div className="place-picker-map-wrap"><div ref={containerRef} className="place-picker-map" />{mapStatus !== "ready" && <div className="place-picker-map-status" role="status">{mapStatus === "loading" ? "Đang mở bản đồ..." : <><span>Chưa tải được bản đồ. Bạn vẫn có thể nhập tọa độ ở dưới.</span><button type="button" className="button button-soft" onClick={() => { setMapStatus("loading"); setRetry((value) => value + 1); }}>Thử lại</button></>}</div>}</div>
      {message && <p className="place-picker-message" role="status">{message}</p>}
      {(latitude || longitude || name) && <div className="place-picker-confirm"><span><strong>Tên:</strong> {name || "Chưa nhập"}</span><span><strong>Ghim:</strong> {latitude && longitude ? `${latitude}, ${longitude}` : "Chưa chọn"}</span>{latitude && longitude && <button type="button" className="plain-button" disabled={disabled} onClick={onClear}><X size={15} /> Bỏ ghim</button>}</div>}
      <p className="place-picker-credit">Tìm địa danh qua Geoapify khi được bật. Bản đồ nền từ OpenFreeMap và OpenStreetMap.</p>
    </div>}
  </div>;
}
