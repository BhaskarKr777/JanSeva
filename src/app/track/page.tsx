'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, CheckCircle2, Clock, Bell, Shield } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import {
  ISSUE_CATEGORIES,
  PUBLIC_TIMELINE_STEPS,
  STATUS_LABELS,
  UI_COPY,
} from '@/lib/i18n';

interface TrackingData {
  referenceNumber: string;
  category: string;
  status: string;
  priority: string;
  timelineStep: number;
  createdAt: string;
  updatedAt: string;
  gramPanchayat?: { name: string; nameHi: string } | null;
  assignedDept?: { name: string; nameHi: string } | null;
  resolution?: {
    publicSafeSummary: string;
    publicSafeSummaryHi: string | null;
    resolvedAt: string;
  } | null;
  notifications: Array<{
    id: string;
    title: string;
    titleHi: string | null;
    message: string;
    messageHi: string | null;
    createdAt: string;
  }>;
}

function TrackContent() {
  const { lang } = useApp();
  const t = UI_COPY[lang];
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [refInput, setRefInput] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingData | null>(null);

  const fetchTracking = async (ref: string) => {
    const clean = ref.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(
          lang === 'hi'
            ? 'यह संदर्भ संख्या नहीं मिली। कृपया जांचकर पुनः प्रयास करें।'
            : json.error || 'Reference number not found.'
        );
      } else {
        setData(json.tracking);
      }
    } catch {
      setError(lang === 'hi' ? 'ट्रैकिंग लोड करने में त्रुटि।' : 'Failed to load tracking status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      void (async () => {
        await fetchTracking(initialRef);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  const catLabel = (key: string) => {
    const found = ISSUE_CATEGORIES.find((c) => c.key === key);
    return found ? (lang === 'hi' ? found.hi : found.en) : key;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#0F2942]">{t.trackTitle}</h1>
        <p className="mt-1 text-xs text-slate-500">
          {lang === 'hi'
            ? 'सार्वजनिक पोर्टल पर केवल सुरक्षित स्थिति एवं अद्यतन दिखाए जाते हैं; व्यक्तिगत विवरण व आंतरिक टिप्पणियाँ गोपनीय रखी जाती हैं।'
            : 'Only public-safe status and resolution updates are displayed. Personal citizen data and internal officer notes remain confidential.'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTracking(refInput);
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder={t.trackPlaceholder}
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono uppercase focus:border-[#0F2942] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F2942] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1d30]"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? '...' : t.trackBtn}</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>{lang === 'hi' ? 'डेमो उदाहरण:' : 'Try Demo Refs:'}</span>
          {['JSV-2026-0001', 'JSV-2026-0002', 'JSV-2026-0004', 'JSV-2026-0007'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRefInput(r);
                fetchTracking(r);
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] hover:border-[#0F2942]"
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {data && (
        <div className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="font-mono text-lg font-bold text-[#0F2942]">
                {data.referenceNumber}
              </div>
              <div className="text-sm font-medium text-slate-700">{catLabel(data.category)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {data.gramPanchayat
                  ? lang === 'hi'
                    ? data.gramPanchayat.nameHi
                    : data.gramPanchayat.name
                  : ''}{' '}
                •{' '}
                {data.assignedDept
                  ? lang === 'hi'
                    ? data.assignedDept.nameHi
                    : data.assignedDept.name
                  : lang === 'hi'
                  ? 'समीक्षाधीन'
                  : 'Under Review'}
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                STATUS_LABELS[data.status]?.color || 'bg-slate-100 text-slate-800'
              }`}
            >
              {STATUS_LABELS[data.status]?.[lang] || data.status}
            </span>
          </div>

          {/* 6-Stage Public Timeline */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {lang === 'hi' ? 'प्रगति समयरेखा' : 'Case Progress Timeline'}
            </h2>
            <div className="space-y-3">
              {PUBLIC_TIMELINE_STEPS.map((step, idx) => {
                const completed = idx <= data.timelineStep;
                const current = idx === data.timelineStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                        completed
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-400'
                      }`}
                    >
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm ${
                          current
                            ? 'font-bold text-[#0F2942]'
                            : completed
                            ? 'font-medium text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {lang === 'hi' ? step.hi : step.en}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.resolution && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <Shield className="h-4 w-4" />
                <span>{lang === 'hi' ? 'अंतिम निस्तारण सारांश' : 'Public Resolution Summary'}</span>
              </div>
              <p className="mt-1.5 text-sm text-emerald-950">
                {lang === 'hi' && data.resolution.publicSafeSummaryHi
                  ? data.resolution.publicSafeSummaryHi
                  : data.resolution.publicSafeSummary}
              </p>
            </div>
          )}

          {data.notifications.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Bell className="h-4 w-4 text-[#0F2942]" />
                <span>{lang === 'hi' ? 'सार्वजनिक सूचनाएं' : 'Public Updates'}</span>
              </h3>
              <div className="space-y-2">
                {data.notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="font-semibold text-slate-800">
                      {lang === 'hi' && n.titleHi ? n.titleHi : n.title}
                    </div>
                    <div className="mt-0.5 text-slate-600">
                      {lang === 'hi' && n.messageHi ? n.messageHi : n.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>
      <TrackContent />
    </Suspense>
  );
}

