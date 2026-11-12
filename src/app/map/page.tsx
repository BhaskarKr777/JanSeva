'use client';

import React, { useEffect, useState } from 'react';
import { Filter, Layers } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ISSUE_CATEGORIES, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/i18n';
import {
  LeafletOverviewMap,
  MapComplaintItem,
  MapProjectItem,
} from '@/components/LeafletOverviewMap';

export default function PublicMapPage() {
  const { lang } = useApp();
  const [complaints, setComplaints] = useState<MapComplaintItem[]>([]);
  const [projects, setProjects] = useState<MapProjectItem[]>([]);
  const [showProjects, setShowProjects] = useState(true);

  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (status !== 'ALL') params.set('status', status);
      if (priority !== 'ALL') params.set('priority', priority);

      const [cRes, pRes] = await Promise.all([
        fetch(`/api/complaints?${params.toString()}`),
        fetch('/api/projects'),
      ]);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      setComplaints(cJson.complaints || []);
      setProjects(pJson.projects || []);
      setLoading(false);
    }
    load();
  }, [category, status, priority]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F2942]">
            {lang === 'hi'
              ? 'सार्वजनिक शिकायत एवं विकास परियोजना मानचित्र (झारखंड डेमो)'
              : 'Public Complaint & Infrastructure Project Map (Jharkhand Demo)'}
          </h1>
          <p className="text-xs text-slate-600">
            {lang === 'hi'
              ? 'नागरिक गोपनीयता हेतु केवल क्षेत्र, श्रेणी और स्थिति प्रदर्शित की जाती है।'
              : 'Displaying clustered reports and simulated demo projects; personal citizen details are redacted.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowProjects((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            showProjects
              ? 'border-[#14532D] bg-emerald-50 text-[#14532D]'
              : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>
            {showProjects
              ? lang === 'hi'
                ? 'परियोजनाएं दिख रही हैं'
                : 'Showing Projects (10)'
              : lang === 'hi'
              ? 'परियोजनाएं छिपी हैं'
              : 'Projects Hidden'}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Filter className="h-3.5 w-3.5" />
          <span>{lang === 'hi' ? 'फ़िल्टर:' : 'Filters:'}</span>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">{lang === 'hi' ? 'सभी श्रेणियां' : 'All Categories'}</option>
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {lang === 'hi' ? c.hi : c.en}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">{lang === 'hi' ? 'सभी स्थितियां' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[lang]}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
        >
          <option value="ALL">{lang === 'hi' ? 'सभी प्राथमिकताएं' : 'All Priorities'}</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[lang]}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs font-medium text-slate-500">
          {loading
            ? lang === 'hi'
              ? 'लोड हो रहा है...'
              : 'Loading...'
            : `${complaints.length} ${lang === 'hi' ? 'शिकायतें' : 'reports'}`}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <LeafletOverviewMap
          complaints={complaints}
          projects={showProjects ? projects : []}
          lang={lang}
          heightClass="h-[540px]"
        />
      </div>
    </div>
  );
}

