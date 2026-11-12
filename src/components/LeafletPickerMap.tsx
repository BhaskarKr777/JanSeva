'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, Search, AlertCircle } from 'lucide-react';
import type LType from 'leaflet';

interface LeafletPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  lang: 'hi' | 'en';
  heightClass?: string;
}

const DEMO_LOCATIONS = [
  { name: 'Chutupalu GP', nameHi: 'चुटूपालू पंचायत', lat: 23.485, lng: 85.462 },
  { name: 'Sonahatu GP', nameHi: 'सोनाहातू पंचायत', lat: 23.215, lng: 85.685 },
  { name: 'Tamar GP', nameHi: 'तमाड़ पंचायत', lat: 23.065, lng: 85.652 },
  { name: 'Pithoria GP', nameHi: 'पिठोरिया पंचायत', lat: 23.512, lng: 85.302 },
  { name: 'Irba GP', nameHi: 'इरबा पंचायत', lat: 23.455, lng: 85.415 },
];

export function LeafletPickerMap({
  lat,
  lng,
  onChange,
  lang,
  heightClass = 'h-72',
}: LeafletPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import('leaflet')).default;
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: 'custom-janseva-pin',
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0F2942;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      map.on('click', (e: LType.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });

      mapRef.current = map;
      markerRef.current = marker;
    }
    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  const handleLocateMe = () => {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError(
        lang === 'hi'
          ? 'आपके ब्राउज़र में GPS उपलब्ध नहीं है। कृपया मानचित्र पर पिन खींचें।'
          : 'Geolocation is not supported by your browser. Please drag the pin on the map.'
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        onChange(newLat, newLng);
        mapRef.current?.setView([newLat, newLng], 15);
      },
      () => {
        setLocError(
          lang === 'hi'
            ? 'स्थान की अनुमति नहीं मिली। कृपया नीचे दिए गए डेमो पंचायत बटन चुनें या मानचित्र पर क्लिक/ड्रैग करें।'
            : 'Location permission denied. You can select a demo Gram Panchayat below or click/drag on the map.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setLocError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Jharkhand, India'
        )}&limit=1`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const foundLat = Number(parseFloat(data[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(data[0].lon).toFixed(6));
        onChange(foundLat, foundLng);
        mapRef.current?.setView([foundLat, foundLng], 14);
      } else {
        setLocError(
          lang === 'hi'
            ? 'स्थान नहीं मिला। मानचित्र पर क्लिक करके स्थान चुनें।'
            : 'Location not found. Please click directly on the map.'
        );
      }
    } catch {
      setLocError(
        lang === 'hi'
          ? 'खोज सेवा उपलब्ध नहीं है। कृपया मानचित्र पर पिन खींचें।'
          : 'Search unavailable offline. Please drag the marker on the map.'
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[200px] items-center gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder={lang === 'hi' ? 'गांव / प्रखंड खोजें (जैसे: ओरमांझी)' : 'Search village / block (e.g. Ormanjhi)'}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#0F2942] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{searching ? '...' : lang === 'hi' ? 'खोजें' : 'Find'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#114223]"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          <span>{lang === 'hi' ? 'वर्तमान स्थान उपयोग करें' : 'Use Current Location'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-500">
          {lang === 'hi' ? 'डेमो पंचायत त्वरित चयन:' : 'Quick Demo GP:'}
        </span>
        {DEMO_LOCATIONS.map((loc) => (
          <button
            key={loc.name}
            type="button"
            onClick={() => {
              onChange(loc.lat, loc.lng);
              mapRef.current?.setView([loc.lat, loc.lng], 14);
            }}
            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:border-[#0F2942] hover:bg-slate-50"
          >
            {lang === 'hi' ? loc.nameHi : loc.name}
          </button>
        ))}
      </div>

      {locError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{locError}</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full ${heightClass} overflow-hidden rounded-lg border border-slate-300 bg-slate-100`}
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {lang === 'hi'
            ? 'मानचित्र पर क्लिक करें या पिन को खींचकर सटीक स्थान चुनें'
            : 'Click on the map or drag the marker to adjust exact location'}
        </span>
        <span className="font-mono text-[11px] text-slate-700">
          GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
    </div>
  );
}

