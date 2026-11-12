'use client';

import React, { useEffect, useRef } from 'react';
import type LType from 'leaflet';

export interface MapComplaintItem {
  id: string;
  referenceNumber: string;
  category: string;
  status: string;
  priority: string;
  lat: number;
  lng: number;
  publicSummary?: string;
  description?: string;
  gramPanchayat?: { name: string; nameHi: string } | null;
  assignedDept?: { name: string; nameHi: string } | null;
}

export interface MapProjectItem {
  id: string;
  projectCode: string;
  title: string;
  titleHi: string;
  status: string;
  lat: number;
  lng: number;
  sanctionedAmount: number;
}

interface LeafletOverviewMapProps {
  complaints: MapComplaintItem[];
  projects?: MapProjectItem[];
  lang: 'hi' | 'en';
  heightClass?: string;
  officerMode?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#991b1b',
  HIGH: '#c2410c',
  MEDIUM: '#b45309',
  LOW: '#0f2942',
};

export function LeafletOverviewMap({
  complaints,
  projects = [],
  lang,
  heightClass = 'h-[520px]',
  officerMode = false,
}: LeafletOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current).setView([23.34, 85.48], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerGroupRef.current = group;
    }
    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function renderMarkers() {
      if (!mapRef.current || !layerGroupRef.current) return;
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');

      const group = layerGroupRef.current;
      group.clearLayers();

      // Use MarkerClusterGroup for complaints
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: true,
      });

      for (const c of complaints) {
        const color = PRIORITY_COLORS[c.priority] || '#0f2942';
        const icon = L.divIcon({
          className: 'janseva-complaint-marker',
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">!</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const summary = c.description || c.publicSummary || '';
        const gpName = lang === 'hi' ? c.gramPanchayat?.nameHi : c.gramPanchayat?.name;
        const linkHref = officerMode ? `/officer/cases/${c.id}` : `/track?ref=${c.referenceNumber}`;
        const linkText = officerMode
          ? lang === 'hi'
            ? 'केस खोलें →'
            : 'Open Case →'
          : lang === 'hi'
          ? 'स्थिति ट्रैक करें →'
          : 'Track Case →';

        const marker = L.marker([c.lat, c.lng], { icon });
        marker.bindPopup(`
          <div style="min-width:210px;font-family:sans-serif;">
            <div style="font-weight:700;color:#0f2942;font-size:13px;">${c.referenceNumber}</div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${c.category.replace(/_/g, ' ')} • <b>${c.priority}</b></div>
            ${gpName ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${gpName}</div>` : ''}
            <p style="font-size:12px;color:#1e293b;margin:6px 0;">${summary.slice(0, 110)}${summary.length > 110 ? '...' : ''}</p>
            <a href="${linkHref}" style="display:inline-block;font-size:12px;font-weight:600;color:#14532d;text-decoration:underline;">${linkText}</a>
          </div>
        `);
        cluster.addLayer(marker);
      }

      group.addLayer(cluster);

      // Render sanctioned project markers separately
      for (const p of projects) {
        const projIcon = L.divIcon({
          className: 'janseva-project-marker',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:#14532D;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">P</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker([p.lat, p.lng], { icon: projIcon });
        marker.bindPopup(`
          <div style="min-width:200px;font-family:sans-serif;">
            <div style="font-weight:700;color:#14532D;font-size:12px;">${p.projectCode} (Project)</div>
            <div style="font-size:12px;font-weight:600;color:#0f172a;margin-top:2px;">${lang === 'hi' ? p.titleHi : p.title}</div>
            <div style="font-size:11px;color:#475569;margin-top:4px;">Sanctioned: ₹${p.sanctionedAmount.toLocaleString('en-IN')}</div>
          </div>
        `);
        group.addLayer(marker);
      }
    }

    const timer = setTimeout(renderMarkers, 150);
    return () => clearTimeout(timer);
  }, [complaints, projects, lang, officerMode]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`w-full ${heightClass} overflow-hidden rounded-lg border border-slate-300 bg-slate-100`}
      />
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#991b1b] inline-block" /> Urgent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#c2410c] inline-block" /> High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#b45309] inline-block" /> Medium
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#0f2942] inline-block" /> Low
        </span>
        {projects.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-[#14532D] inline-block" /> Sanctioned Project
          </span>
        )}
      </div>
    </div>
  );
}

