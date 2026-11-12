'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Camera,
  Mic,
  Save,
  Send,
  Wifi,
  WifiOff,
  CheckSquare,
  LocateFixed,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { STATUS_LABELS } from '@/lib/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const DEFAULT_CHECKLIST = [
  'Verify GPS coordinates match reported / sanctioned site',
  'Measure physical dimensions against sanctioned estimate',
  'Capture site photographs with timestamp',
  'Record local citizen / witness observation',
];

export default function FieldOfficerAppPage() {
  const { lang, user, loadingUser } = useApp();
  const [complaints, setComplaints] = useState<AnyObj[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Inspection Form State
  const [gpsLat, setGpsLat] = useState<number>(23.4864);
  const [gpsLng, setGpsLng] = useState<number>(85.4633);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(8);
  const [observations, setObservations] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [checklist, setChecklist] = useState(
    DEFAULT_CHECKLIST.map((item) => ({ item, checked: false }))
  );
  const [measurements, setMeasurements] = useState<
    Array<{ estimateItemId?: string; itemName: string; unit: string; measuredQty: string; notes: string }>
  >([]);
  const [evidenceFiles, setEvidenceFiles] = useState<
    Array<{ fileName: string; fileUrl: string; mimeType: string; caption?: string }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);

  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  const loadList = useCallback(async () => {
    if (!user || !['FIELD_OFFICER', 'ADMIN'].includes(user.role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/complaints?assignedToMe=true', { cache: 'no-store' });
      const data = await res.json();
      setComplaints(data.complaints || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loadingUser) {
      void (async () => {
        await loadList();
      })();
    }
  }, [loadingUser, loadList]);

  const openInspection = async (cId: string) => {
    setSelectedId(cId);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/complaints/${cId}`, { cache: 'no-store' });
    const data = await res.json();
    const c = data.complaint;
    setSelectedCase(c);
    setGpsLat(c.lat);
    setGpsLng(c.lng);

    // Check offline draft first
    const draftRaw = localStorage.getItem(`janseva_field_draft_${cId}`);
    if (draftRaw) {
      const d = JSON.parse(draftRaw);
      setObservations(d.observations || '');
      setVoiceTranscript(d.voiceTranscript || '');
      setChecklist(d.checklist || DEFAULT_CHECKLIST.map((item) => ({ item, checked: false })));
      setMeasurements(d.measurements || []);
      setEvidenceFiles(d.evidenceFiles || []);
      setMessage(lang === 'hi' ? 'ऑफ़लाइन ड्राफ्ट लोड किया गया।' : 'Loaded saved offline draft.');
      return;
    }

    setObservations('');
    setVoiceTranscript('');
    setChecklist(DEFAULT_CHECKLIST.map((item) => ({ item, checked: false })));
    setEvidenceFiles([]);
    if (c.linkedProject?.estimates?.length) {
      setMeasurements(
        c.linkedProject.estimates.map((e: AnyObj) => ({
          estimateItemId: e.id,
          itemName: e.itemName,
          unit: e.unit,
          measuredQty: String(e.sanctionedQty),
          notes: '',
        }))
      );
    } else {
      setMeasurements([{ itemName: 'Affected Length / Area', unit: 'meters', measuredQty: '0', notes: '' }]);
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation unavailable on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(Number(pos.coords.latitude.toFixed(6)));
        setGpsLng(Number(pos.coords.longitude.toFixed(6)));
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setMessage(lang === 'hi' ? 'GPS निर्देशांक कैप्चर किए गए।' : 'GPS coordinates captured.');
      },
      () => setError('Location permission denied; using complaint coordinates as reference.')
    );
  };

  const startHindiDictation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(
        lang === 'hi'
          ? 'इस ब्राउज़र में वॉइस डिक्टेशन समर्थित नहीं है; कृपया नीचे टाइप करें।'
          : 'Browser speech recognition not supported; please type observations below.'
      );
      return;
    }
    const recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    setDictating(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setVoiceTranscript((prev) => (prev ? `${prev} ${text}` : text));
      setObservations((prev) => (prev ? `${prev} ${text}` : text));
    };
    recognition.onerror = () => setDictating(false);
    recognition.onend = () => setDictating(false);
    recognition.start();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'field-inspections');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setEvidenceFiles((prev) => [
          ...prev,
          { fileName: data.fileName, fileUrl: data.fileUrl, mimeType: data.mimeType, caption: 'Site Inspection Photo' },
        ]);
      }
    }
  };

  const saveOfflineDraft = () => {
    if (!selectedId) return;
    localStorage.setItem(
      `janseva_field_draft_${selectedId}`,
      JSON.stringify({
        observations,
        voiceTranscript,
        checklist,
        measurements,
        evidenceFiles,
        savedAt: new Date().toISOString(),
      })
    );
    setMessage(
      lang === 'hi'
        ? 'निरीक्षण ड्राफ्ट ऑफ़लाइन सुरक्षित किया गया।'
        : 'Inspection draft saved offline on this device.'
    );
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !selectedCase) return;
    if (!isOnline) {
      saveOfflineDraft();
      setError('You are currently offline. Draft saved locally for sync when online.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const activeAssignment = selectedCase.inspectionAssignments?.find(
        (a: AnyObj) => a.status !== 'COMPLETED'
      );
      const res = await fetch(`/api/complaints/${selectedId}/inspect`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: activeAssignment?.id,
          gpsLat,
          gpsLng,
          gpsAccuracy,
          observations,
          voiceTranscript,
          checklist,
          measurements: measurements.map((m) => ({
            estimateItemId: m.estimateItemId,
            itemName: m.itemName,
            unit: m.unit,
            measuredQty: parseFloat(m.measuredQty) || 0,
            notes: m.notes,
          })),
          evidenceFiles,
          isDraft: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit report');
      } else {
        localStorage.removeItem(`janseva_field_draft_${selectedId}`);
        setMessage(
          lang === 'hi'
            ? 'स्थल निरीक्षण रिपोर्ट सफलतापूर्वक सबमिट हो गई!'
            : 'Field inspection report submitted successfully!'
        );
        setSelectedId(null);
        setSelectedCase(null);
        await loadList();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!loadingUser && (!user || !['FIELD_OFFICER', 'ADMIN'].includes(user.role))) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold text-[#0F2942]">Field Officer Login Required</h1>
          <p className="mt-1 text-xs text-slate-600">
            Sign in as <b>field@janseva.demo</b> or <b>field2@janseva.demo</b> to access assigned site inspections.
          </p>
          <Link href="/login" className="mt-4 inline-block rounded-lg bg-[#0F2942] px-5 py-2 text-xs font-semibold text-white">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-20 space-y-4">
      {/* Online / Offline Sync Banner */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-[#0F2942]">
            {lang === 'hi' ? 'क्षेत्रीय स्थल निरीक्षण ऐप' : 'Field Officer Verification App'}
          </h1>
          <p className="text-[11px] text-slate-500">
            {lang === 'hi' ? 'मोबाइल-अनुकूल GPS एवं ऑफ़लाइन ड्राफ्ट समर्थन' : 'Mobile-first GPS capture & offline draft sync'}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
        </span>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-900">
          {error}
        </div>
      )}

      {!selectedCase ? (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {lang === 'hi' ? `सौंपे गए निरीक्षण (${complaints.length})` : `Assigned Inspections (${complaints.length})`}
          </h2>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading assignments...</div>
          ) : complaints.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No inspections currently assigned to your account.
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#0F2942]">
                      {c.referenceNumber}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      {STATUS_LABELS[c.status]?.[lang] || c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700 line-clamp-2">{c.description}</p>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {lang === 'hi' ? c.gramPanchayat?.nameHi : c.gramPanchayat?.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openInspection(c.id)}
                  className="shrink-0 rounded-lg bg-[#0F2942] px-3.5 py-2 text-xs font-semibold text-white"
                >
                  {lang === 'hi' ? 'निरीक्षण खोलें' : 'Inspect'}
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <form onSubmit={submitReport} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="font-mono text-sm font-bold text-[#0F2942]">
                {selectedCase.referenceNumber}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">{selectedCase.description}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCase(null);
                setSelectedId(null);
              }}
              className="text-xs font-semibold text-slate-500 underline"
            >
              Back
            </button>
          </div>

          {/* GPS Capture */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#14532D]" />
                <span>Site GPS Coordinates</span>
              </div>
              <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                {gpsLat.toFixed(5)}, {gpsLng.toFixed(5)} (±{gpsAccuracy}m)
              </div>
            </div>
            <button
              type="button"
              onClick={captureGPS}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span>Capture Live GPS</span>
            </button>
          </div>

          {/* Checklist */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'निरीक्षण चेकलिस्ट' : 'Inspection Checklist'}</span>
            </h3>
            <div className="space-y-1.5">
              {checklist.map((c, idx) => (
                <label key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={(e) => {
                      const next = [...checklist];
                      next[idx].checked = e.target.checked;
                      setChecklist(next);
                    }}
                    className="rounded border-slate-300"
                  />
                  <span>{c.item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Physical Measurements */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2">
              {lang === 'hi' ? 'भौतिक माप (स्थल पर)' : 'Physical Measurements Observed'}
            </h3>
            <div className="space-y-2">
              {measurements.map((m, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2.5 sm:grid-cols-3">
                  <div className="text-xs font-medium text-slate-800">
                    {m.itemName} ({m.unit})
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={m.measuredQty}
                    onChange={(e) => {
                      const next = [...measurements];
                      next[idx].measuredQty = e.target.value;
                      setMeasurements(next);
                    }}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Notes"
                    value={m.notes}
                    onChange={(e) => {
                      const next = [...measurements];
                      next[idx].notes = e.target.value;
                      setMeasurements(next);
                    }}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Observations + Hindi Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                {lang === 'hi' ? 'स्थल अवलोकन (हिंदी / अंग्रेज़ी)' : 'Field Observations (Hindi / English) *'}
              </label>
              <button
                type="button"
                onClick={startHindiDictation}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold ${
                  dictating ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Mic className="h-3 w-3" />
                <span>{dictating ? 'Listening (hi-IN)...' : 'Dictate in Hindi'}</span>
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="स्थल पर देखी गई स्थिति एवं माप का विवरण दर्ज करें..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          {/* Site Photos */}
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700">
              <Camera className="h-4 w-4 text-[#0F2942]" />
              <span>{lang === 'hi' ? 'स्थल फोटो अपलोड करें' : 'Capture / Upload Site Photos'}</span>
              <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
            {evidenceFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {evidenceFiles.map((f, i) => (
                  <span key={i} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                    📷 {f.fileName}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={saveOfflineDraft}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700"
            >
              <Save className="h-4 w-4" />
              <span>{lang === 'hi' ? 'ऑफ़लाइन ड्राफ्ट सहेजें' : 'Save Offline Draft'}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F2942] px-4 py-2.5 text-xs font-semibold text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{lang === 'hi' ? 'निरीक्षण रिपोर्ट सबमिट करें' : 'Submit Inspection Report'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

