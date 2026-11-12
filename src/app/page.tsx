'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Mic,
  Square,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck2,
  Loader2,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ISSUE_CATEGORIES, UI_COPY } from '@/lib/i18n';
import { LeafletPickerMap } from '@/components/LeafletPickerMap';

interface UploadedAttachment {
  fileType: 'PHOTO' | 'VOICE_NOTE';
  fileName: string;
  fileUrl: string;
  mimeType: string;
}

interface SubmittedResult {
  referenceNumber: string;
  status: string;
  priority: string;
  assignedDept?: { name: string; nameHi: string } | null;
  linkedProject?: { projectCode: string; title: string; titleHi: string } | null;
  aiAnalysis?: {
    structuredEnglishSummary: string;
    priorityExplanation: string;
    suggestedDepartmentReason: string;
    possibleLinkedProjectReason: string | null;
    duplicateExplanation: string | null;
  };
}

export default function CitizenReportPage() {
  const { lang } = useApp();
  const t = UI_COPY[lang];

  const [category, setCategory] = useState<string>('DAMAGED_ROAD');
  const [lat, setLat] = useState<number>(23.4862);
  const [lng, setLng] = useState<number>(85.4631);
  const [locationDescription, setLocationDescription] = useState('');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedResult | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'citizen-reports');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          setAttachments((prev) => [
            ...prev,
            {
              fileType: 'PHOTO',
              fileName: data.fileName,
              fileUrl: data.fileUrl,
              mimeType: data.mimeType,
            },
          ]);
        }
      }
    } catch {
      setError(lang === 'hi' ? 'फोटो अपलोड विफल रहा।' : 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const toggleVoiceRecording = async () => {
    setVoiceError(null);
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'voice-notes');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          setAttachments((prev) => [
            ...prev,
            {
              fileType: 'VOICE_NOTE',
              fileName: data.fileName,
              fileUrl: data.fileUrl,
              mimeType: data.mimeType,
            },
          ]);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setVoiceError(
        lang === 'hi'
          ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। आप लिखित विवरण दर्ज कर सकते हैं।'
          : 'Microphone permission unavailable. You can submit using text description.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          language: lang,
          lat,
          lng,
          locationDescription,
          citizenName,
          citizenPhone,
          attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
      } else {
        setSubmitted({
          ...data.complaint,
          aiAnalysis: data.complaint.aiAnalysis,
        });
      }
    } catch {
      setError(lang === 'hi' ? 'नेटवर्क त्रुटि। पुनः प्रयास करें।' : 'Network error. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-xl font-bold">
                {lang === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज हो गई' : 'Complaint Submitted Successfully'}
              </h1>
              <p className="text-sm text-slate-600">
                {lang === 'hi'
                  ? 'कृपया भविष्य में स्थिति जानने के लिए नीचे दी गई संदर्भ संख्या सुरक्षित रखें।'
                  : 'Please save your unique reference number below to track progress.'}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {lang === 'hi' ? 'शिकायत संदर्भ संख्या' : 'Complaint Reference Number'}
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-[#0F2942]">
              {submitted.referenceNumber}
            </div>
          </div>

          {submitted.aiAnalysis && (
            <div className="mt-5 space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-[#0F2942]">
                <Sparkles className="h-4 w-4 text-blue-700" />
                <span>
                  {lang === 'hi'
                    ? 'प्रारंभिक AI वर्गीकरण एवं रूटिंग सारांश'
                    : 'Preliminary AI Intake & Routing Summary'}
                </span>
              </div>
              <p className="text-xs text-slate-700">
                <b>{lang === 'hi' ? 'सुझावित विभाग:' : 'Department:'}</b>{' '}
                {submitted.assignedDept
                  ? lang === 'hi'
                    ? submitted.assignedDept.nameHi
                    : submitted.assignedDept.name
                  : lang === 'hi'
                  ? 'मैन्युअल समीक्षा कतार'
                  : 'Manual Triage Queue'}
              </p>
              <p className="text-xs text-slate-700">
                <b>{lang === 'hi' ? 'प्राथमिकता:' : 'Suggested Priority:'}</b> {submitted.priority} —{' '}
                {submitted.aiAnalysis.priorityExplanation}
              </p>
              {submitted.linkedProject && (
                <p className="text-xs text-emerald-900">
                  <b>{lang === 'hi' ? 'संभावित संबद्ध परियोजना:' : 'Possible Linked Project:'}</b>{' '}
                  {submitted.linkedProject.projectCode} —{' '}
                  {lang === 'hi' ? submitted.linkedProject.titleHi : submitted.linkedProject.title}
                </p>
              )}
              {submitted.aiAnalysis.duplicateExplanation && (
                <p className="text-xs text-amber-900">{submitted.aiAnalysis.duplicateExplanation}</p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/track?ref=${submitted.referenceNumber}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1d30]"
            >
              <span>{lang === 'hi' ? 'स्थिति ट्रैक करें' : 'Track Complaint Status'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(null);
                setDescription('');
                setAttachments([]);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {lang === 'hi' ? 'नई शिकायत दर्ज करें' : 'Submit Another'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">{t.submitTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.submitSubtitle}</p>
        </div>
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F2942] hover:bg-slate-50"
        >
          <FileCheck2 className="h-4 w-4" />
          <span>{lang === 'hi' ? 'पुरानी शिकायत ट्रैक करें' : 'Track Existing Report'}</span>
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        {/* Step 1: Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            1. {t.selectCategory} *
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ISSUE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  category === cat.key
                    ? 'border-[#0F2942] bg-[#0F2942]/5 font-semibold text-[#0F2942]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang === 'hi' ? cat.hi : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Interactive Map */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            2. {t.selectLocation} *
          </label>
          <LeafletPickerMap lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }} lang={lang} />
          <input
            type="text"
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            placeholder={
              lang === 'hi'
                ? 'पास का लैंडमार्क (जैसे: मध्य विद्यालय चुटूपालू के पास)'
                : 'Nearby landmark (e.g., near Chutupalu Middle School)'
            }
            className="mt-2.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0F2942] focus:outline-none"
          />
        </div>

        {/* Step 3: Description */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-800">
              3. {t.descriptionLabel} *
            </label>
            <button
              type="button"
              onClick={() =>
                setDescription(
                  'हमारे गांव की नई बनी सड़क दो महीने में टूट गई है और बारिश में पानी भर जाता है।'
                )
              }
              className="text-xs font-medium text-[#14532D] underline hover:text-[#0F2942]"
            >
              {lang === 'hi' ? 'उदाहरण पाठ भरें' : 'Fill Sample Hindi Report'}
            </button>
          </div>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descriptionPlaceholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#0F2942] focus:outline-none"
          />
        </div>

        {/* Step 4: Photos & Voice Note */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t.photosLabel}
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Camera className="h-4 w-4 text-[#0F2942]" />
              <span>{uploading ? (lang === 'hi' ? 'अपलोड हो रहा है...' : 'Uploading...') : lang === 'hi' ? 'फोटो चुनें' : 'Select Photos'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t.voiceLabel}
            </label>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                recording
                  ? 'bg-red-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4 text-[#14532D]" />}
              <span>
                {recording
                  ? lang === 'hi'
                    ? 'रिकॉर्डिंग रोकें'
                    : 'Stop Recording'
                  : lang === 'hi'
                  ? 'आवाज़ रिकॉर्ड करें'
                  : 'Record Voice Note'}
              </span>
            </button>
            {voiceError && <p className="mt-1.5 text-[11px] text-amber-800">{voiceError}</p>}
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"
              >
                <span>{att.fileType === 'PHOTO' ? '📷' : '🎙️'}</span>
                <span className="max-w-[140px] truncate">{att.fileName}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Lightweight Citizen Contact */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              4. {t.citizenNameLabel} *
            </label>
            <input
              type="text"
              required
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              placeholder={lang === 'hi' ? 'जैसे: रमेश महतो' : 'e.g. Ramesh Mahato'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0F2942] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              5. {t.citizenPhoneLabel} *
            </label>
            <input
              type="tel"
              required
              value={citizenPhone}
              onChange={(e) => setCitizenPhone(e.target.value)}
              placeholder="98765XXXXX"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0F2942] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F2942] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a1d30] disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{submitting ? (lang === 'hi' ? 'सबमिट हो रहा है...' : 'Submitting...') : t.submitBtn}</span>
        </button>
      </form>
    </div>
  );
}
