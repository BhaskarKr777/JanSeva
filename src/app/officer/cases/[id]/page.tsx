'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Scale,
  ClipboardCheck,
  History,
  Sparkles,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Users,
  MapPin,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ScanSearch,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import {
  DOC_TYPE_LABELS,
  ISSUE_CATEGORIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@/lib/i18n';
import { formatCurrencyINR } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function ImageAuthBadge({ fileUrl, context, analyzeImage, imageAnalysis, lang }: {
  fileUrl: string;
  context: string;
  analyzeImage: (fileUrl: string, context: string) => void;
  imageAnalysis: Record<string, { loading: boolean; result: AnyObj | null }>;
  lang: string;
}) {
  const state = imageAnalysis[fileUrl];

  if (!state) {
    return (
      <button
        onClick={() => analyzeImage(fileUrl, context)}
        className="mt-1.5 flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-[#0F2942] hover:text-white transition-colors"
      >
        <ScanSearch className="h-3 w-3" />
        {lang === 'hi' ? 'AI छवि जाँच' : 'Analyze Image'}
      </button>
    );
  }

  if (state.loading) {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        {lang === 'hi' ? 'विश्लेषण हो रहा है…' : 'Analyzing…'}
      </div>
    );
  }

  const r = state.result;
  const verdict = r?.verdict || 'INSUFFICIENT_DATA';
  const verdictConfig = {
    LIKELY_AUTHENTIC: { icon: ShieldCheck, color: 'text-emerald-800 bg-emerald-50 border-emerald-300', label: lang === 'hi' ? '✅ संभवतः प्रामाणिक' : '✅ Likely Authentic' },
    POTENTIALLY_MANIPULATED: { icon: ShieldAlert, color: 'text-red-800 bg-red-50 border-red-300', label: lang === 'hi' ? '🔴 संभावित छेड़छाड़' : '🔴 Potentially Manipulated' },
    INSUFFICIENT_DATA: { icon: ShieldQuestion, color: 'text-amber-800 bg-amber-50 border-amber-300', label: lang === 'hi' ? '🟡 अपर्याप्त डेटा' : '🟡 Insufficient Data' },
  };
  const cfg = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.INSUFFICIENT_DATA;

  return (
    <div className={`mt-1.5 rounded border p-2 text-[10px] space-y-1 ${cfg.color}`}>
      <div className="font-bold">{cfg.label}</div>
      {typeof r?.confidenceScore === 'number' && (
        <div>Confidence: {Math.round(r.confidenceScore * 100)}%</div>
      )}
      {r?.providerUsed && (
        <div className="text-[9px] opacity-75">Provider: {r.providerUsed}</div>
      )}
      {Array.isArray(r?.flags) && r.flags.length > 0 && (
        <ul className="pl-3 list-disc space-y-0.5">
          {r.flags.slice(0, 4).map((f: string, i: number) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {r?.recommendation && (
        <div className="mt-1 italic opacity-90">{r.recommendation}</div>
      )}
      {r?.disclaimer && (
        <div className="mt-1 text-[9px] opacity-60 border-t pt-1">{r.disclaimer}</div>
      )}
      <button
        onClick={() => analyzeImage(fileUrl, context)}
        className="mt-1 text-[9px] underline opacity-70 hover:opacity-100"
      >
        Re-analyze
      </button>
    </div>
  );
}

export default function CaseWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, user } = useApp();

  const [complaint, setComplaint] = useState<AnyObj | null>(null);
  const [projectAi, setProjectAi] = useState<AnyObj | null>(null);
  const [departments, setDepartments] = useState<AnyObj[]>([]);
  const [projects, setProjects] = useState<AnyObj[]>([]);
  const [fieldOfficers, setFieldOfficers] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'desk' | 'evidence' | 'decision' | 'audit'>('overview');

  // Action states
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Schedule inspection form
  const [selectedFieldOfficer, setSelectedFieldOfficer] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [instructions, setInstructions] = useState('');

  // Decision form
  const [decisionType, setDecisionType] = useState('APPROVE_ACTION');
  const [decisionReason, setDecisionReason] = useState('');
  const [publicSummary, setPublicSummary] = useState('');

  // Doc upload form
  const [docType, setDocType] = useState('COMPLETION_CERTIFICATE');
  const [docTitle, setDocTitle] = useState('');

  // Image authenticity analysis state
  // keyed by fileUrl → result object
  const [imageAnalysis, setImageAnalysis] = useState<Record<string, { loading: boolean; result: AnyObj | null }>>({});

  const analyzeImage = useCallback(async (fileUrl: string, context: string) => {
    setImageAnalysis((prev) => ({ ...prev, [fileUrl]: { loading: true, result: null } }));
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, context }),
      });
      const data = await res.json();
      setImageAnalysis((prev) => ({ ...prev, [fileUrl]: { loading: false, result: data } }));
    } catch {
      setImageAnalysis((prev) => ({
        ...prev,
        [fileUrl]: { loading: false, result: { verdict: 'INSUFFICIENT_DATA', flags: ['Analysis failed — network error.'], recommendation: 'Retry or verify manually.' } },
      }));
    }
  }, []);

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes, aRes] = await Promise.all([
        fetch(`/api/complaints/${id}`, { cache: 'no-store' }),
        fetch('/api/projects', { cache: 'no-store' }),
        fetch('/api/admin', { cache: 'no-store' }),
      ]);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      const aJson = aRes.ok ? await aRes.json() : {};

      setComplaint(cJson.complaint || null);
      setProjectAi(cJson.projectAiAnalysis || null);
      setProjects(pJson.projects || []);
      setDepartments(aJson.departments || []);
      const fOfficers = (aJson.users || []).filter(
        (u: AnyObj) => u.role === 'FIELD_OFFICER'
      );
      setFieldOfficers(fOfficers);
      if (fOfficers.length > 0 && !selectedFieldOfficer) {
        setSelectedFieldOfficer(fOfficers[0].id);
      }
    } catch {
      setErrorMsg('Failed to load case details.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedFieldOfficer]);

  useEffect(() => {
    void (async () => {
      await loadCase();
    })();
  }, [loadCase]);

  const handlePatch = async (payload: Record<string, unknown>, msg: string) => {
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Update failed');
      } else {
        setFeedback(msg);
        await loadCase();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/complaints/${id}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldOfficerId: selectedFieldOfficer,
          scheduledDate,
          instructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to schedule inspection');
      } else {
        setFeedback(lang === 'hi' ? 'स्थल निरीक्षण निर्धारित किया गया।' : 'Field inspection scheduled.');
        setInstructions('');
        await loadCase();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/complaints/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType,
          reason: decisionReason,
          publicSafeSummary: publicSummary || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to record decision');
      } else {
        setFeedback(lang === 'hi' ? 'अधिकारी निर्णय दर्ज किया गया।' : 'Administrative decision recorded.');
        setDecisionReason('');
        setPublicSummary('');
        await loadCase();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !complaint?.linkedProject?.id) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'project-docs');
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) {
        setErrorMsg(upJson.error || 'Upload failed');
        return;
      }
      const res = await fetch(`/api/projects/${complaint.linkedProject.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          title: docTitle || file.name,
          fileUrl: upJson.fileUrl,
          mimeType: upJson.mimeType,
          complaintId: complaint.id,
        }),
      });
      if (res.ok) {
        setFeedback(lang === 'hi' ? 'दस्तावेज़ अपलोड हो गया।' : 'Project document uploaded.');
        setDocTitle('');
        await loadCase();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading case workspace...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-red-700">Case not found or officer login required.</p>
        <Link href="/officer" className="mt-3 inline-block text-sm font-semibold text-[#0F2942] underline">
          Back to Officer Dashboard
        </Link>
      </div>
    );
  }

  const catObj = ISSUE_CATEGORIES.find((c) => c.key === complaint.category);
  const project = complaint.linkedProject;
  const latestReport = complaint.inspectionReports?.[0] || null;
  const relatedList = [
    ...(complaint.relatedFrom || []).map((r: AnyObj) => r.targetComplaint),
    ...(complaint.relatedTo || []).map((r: AnyObj) => r.sourceComplaint),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <Link
            href="/officer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0F2942]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{lang === 'hi' ? 'डैशबोर्ड पर वापस' : 'Back to Dashboard'}</span>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-bold text-[#0F2942]">
              {complaint.referenceNumber}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                STATUS_LABELS[complaint.status]?.color || ''
              }`}
            >
              {STATUS_LABELS[complaint.status]?.[lang] || complaint.status}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                PRIORITY_LABELS[complaint.priority]?.color || ''
              }`}
            >
              {PRIORITY_LABELS[complaint.priority]?.[lang] || complaint.priority}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {catObj ? catObj[lang] : complaint.category} •{' '}
            {lang === 'hi' ? complaint.village?.nameHi : complaint.village?.name},{' '}
            {lang === 'hi' ? complaint.gramPanchayat?.nameHi : complaint.gramPanchayat?.name}
          </p>
        </div>

        <div className="text-right text-xs text-slate-600 space-y-1">
          <div>
            <b>{lang === 'hi' ? 'नागरिक:' : 'Citizen:'}</b> {complaint.citizenName} ({complaint.citizenPhone})
          </div>
          <div>
            <b>{lang === 'hi' ? 'विभाग:' : 'Department:'}</b>{' '}
            {complaint.assignedDept
              ? lang === 'hi'
                ? complaint.assignedDept.nameHi
                : complaint.assignedDept.name
              : 'Manual Triage'}
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            GPS: {complaint.lat.toFixed(5)}, {complaint.lng.toFixed(5)}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-900">
          {errorMsg}
        </div>
      )}

      {/* Workflow Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {[
          { key: 'overview', labelEn: 'Case Overview & Routing', labelHi: 'विवरण एवं रूटिंग', icon: MapPin },
          { key: 'desk', labelEn: 'Stage 1: Desk Scrutiny', labelHi: 'चरण 1: दस्तावेज़ जाँच', icon: FileText },
          { key: 'evidence', labelEn: 'Project Evidence Room (3-Col)', labelHi: 'साक्ष्य तुलना कक्ष', icon: Scale },
          { key: 'decision', labelEn: 'Stage 2 & 3: Inspection & Decision', labelHi: 'चरण 2 व 3: निरीक्षण व निर्णय', icon: ClipboardCheck },
          { key: 'audit', labelEn: `Audit Trail (${complaint.auditEvents?.length || 0})`, labelHi: `ऑडिट इतिहास (${complaint.auditEvents?.length || 0})`, icon: History },
        ].map((tItem) => {
          const Icon = tItem.icon;
          const active = tab === tItem.key;
          return (
            <button
              key={tItem.key}
              type="button"
              onClick={() => setTab(tItem.key as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#0F2942] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? tItem.labelHi : tItem.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ROUTING */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-[#0F2942]">
                {lang === 'hi' ? 'नागरिक शिकायत विवरण' : 'Citizen Complaint Details'}
              </h2>
              <p className="rounded-lg bg-slate-50 p-3.5 text-sm text-slate-800 border border-slate-200">
                {complaint.description}
              </p>
              {complaint.descriptionEn && (
                <div className="text-xs text-slate-600">
                  <b>English Summary:</b> {complaint.descriptionEn}
                </div>
              )}
              {complaint.locationDescription && (
                <div className="text-xs text-slate-600">
                  <b>{lang === 'hi' ? 'स्थान विवरण:' : 'Landmark:'}</b> {complaint.locationDescription}
                </div>
              )}

              {complaint.attachments?.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {lang === 'hi' ? 'नागरिक द्वारा संलग्न साक्ष्य' : 'Citizen Attachments'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {complaint.attachments.map((att: AnyObj) => (
                      <div key={att.id} className="rounded-lg border border-slate-200 p-2 bg-slate-50">
                        {att.fileType === 'PHOTO' ? (
                          <>
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="h-28 w-full rounded object-cover"
                            />
                            <div className="mt-1 truncate text-[11px] text-slate-600">{att.caption || att.fileName}</div>
                            <ImageAuthBadge
                              fileUrl={att.fileUrl}
                              context="citizen_complaint"
                              analyzeImage={analyzeImage}
                              imageAnalysis={imageAnalysis}
                              lang={lang}
                            />
                          </>
                        ) : (
                          <>
                            <audio controls src={att.fileUrl} className="w-full" />
                            <div className="mt-1 truncate text-[11px] text-slate-600">{att.caption || att.fileName}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Intake & Explanation */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F2942]">
                <Sparkles className="h-4 w-4 text-blue-700" />
                <span>{lang === 'hi' ? 'AI इनटेक विश्लेषण एवं पारदर्शी तर्क' : 'AI Intake Analysis & Routing Explanation'}</span>
              </div>
              <p className="text-xs text-slate-700">{complaint.aiSummary || 'No AI summary generated.'}</p>
              {complaint.aiExplanation && (
                <p className="text-xs text-slate-600">
                  <b>{lang === 'hi' ? 'तर्क:' : 'Explanation:'}</b> {complaint.aiExplanation}
                </p>
              )}
              <p className="text-[11px] text-slate-500 italic">
                Note: AI provides recommendations only. All administrative assignments and decisions require human officer authorisation.
              </p>
            </div>

            {/* Duplicate / Related Complaints Group */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#0F2942]">
                  <Users className="h-4 w-4" />
                  <span>
                    {lang === 'hi'
                      ? `संबद्ध / संभावित डुप्लीकेट शिकायतें (${relatedList.length})`
                      : `Related & Duplicate Complaints Cluster (${relatedList.length})`}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'hi'
                  ? 'प्रत्येक नागरिक की मूल शिकायत और संदर्भ संख्या सुरक्षित रखी जाती है; इन्हें केवल साझा जांच हेतु जोड़ा जाता है।'
                  : 'Each citizen report and reference number is preserved without auto-deletion; officers link them to a common investigation.'}
              </p>
              {relatedList.length === 0 ? (
                <div className="text-xs text-slate-400">No linked related complaints.</div>
              ) : (
                <div className="space-y-2">
                  {relatedList.map((rc: AnyObj) => (
                    <Link
                      key={rc.id}
                      href={`/officer/cases/${rc.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-[#0F2942]"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-[#0F2942]">
                          {rc.referenceNumber}
                        </span>
                        <p className="text-xs text-slate-700 mt-0.5 line-clamp-1">{rc.description}</p>
                      </div>
                      <span className="rounded border px-2 py-0.5 text-[10px] font-semibold bg-white">
                        {rc.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Routing & Project Link Controls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#0F2942]">
                {lang === 'hi' ? 'विभाग एवं परियोजना संबद्धता' : 'Department & Project Assignment'}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'hi' ? 'जिम्मेदार विभाग चुनें' : 'Assigned Department'}
                </label>
                <select
                  value={complaint.assignedDeptId || ''}
                  disabled={saving}
                  onChange={(e) =>
                    handlePatch({ assignedDeptId: e.target.value }, 'Department assignment updated.')
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">-- Manual Triage / Unassigned --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lang === 'hi' ? d.nameHi : d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'hi' ? 'संबद्ध सरकारी विकास परियोजना' : 'Linked Development Project'}
                </label>
                <select
                  value={complaint.linkedProjectId || ''}
                  disabled={saving}
                  onChange={(e) =>
                    handlePatch(
                      { linkedProjectId: e.target.value || null },
                      'Linked project updated.'
                    )
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">-- No Linked Project (Standalone Civic Issue) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} — {lang === 'hi' ? p.titleHi : p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAGE 1 - DESK SCRUTINY */}
      {tab === 'desk' && (
        <div className="space-y-5">
          {!project ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-2 text-sm font-bold text-slate-800">
                {lang === 'hi'
                  ? 'कोई सरकारी परियोजना संबद्ध नहीं है'
                  : 'No Linked Sanctioned Project'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {lang === 'hi'
                  ? 'यह एक सामान्य नागरिक समस्या है (जैसे नाली या हैंडपंप)। आप सीधे स्थल निरीक्षण निर्धारित कर सकते हैं या ओवरव्यू टैब से परियोजना जोड़ सकते हैं।'
                  : 'This complaint is currently not linked to a capital development project. You may proceed directly to field inspection or link a project in the Overview tab.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {project.projectCode}
                      </span>
                      <h2 className="text-base font-bold text-[#0F2942]">
                        {lang === 'hi' ? project.titleHi : project.title}
                      </h2>
                      <p className="text-xs text-slate-500">{project.schemeName}</p>
                    </div>
                    <div className="text-right text-xs">
                      <div>
                        <b>Sanctioned:</b> {formatCurrencyINR(project.sanctionedAmount)}
                      </div>
                      <div>
                        <b>Expenditure:</b> {formatCurrencyINR(project.expenditureAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Documents Grid */}
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {lang === 'hi' ? 'परियोजना दस्तावेज़ एवं फोटो' : 'Project Dossier Documents'}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {project.documents.map((doc: AnyObj) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-[#0F2942]"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#0F2942]">
                              {DOC_TYPE_LABELS[doc.docType]?.[lang] || doc.docType}
                            </div>
                            <div className="truncate text-xs text-slate-600">{doc.title}</div>
                          </div>
                          <span className="text-[11px] font-semibold text-[#14532D] ml-2">View</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Upload Document */}
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3.5">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      {lang === 'hi' ? 'नया परियोजना दस्तावेज़ अपलोड करें' : 'Upload Additional Project Document'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v[lang]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder={lang === 'hi' ? 'दस्तावेज़ शीर्षक' : 'Document title'}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs flex-1 min-w-[150px]"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-[#0F2942] px-3 py-1.5 text-xs font-semibold text-white">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{saving ? '...' : lang === 'hi' ? 'फ़ाइल चुनें' : 'Upload File'}</span>
                        <input type="file" onChange={handleDocUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Document Analysis Panel */}
              <div className="space-y-4">
                {projectAi && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0F2942]">
                      <Sparkles className="h-4 w-4 text-amber-700" />
                      <span>{lang === 'hi' ? 'AI दस्तावेज़ एवं विसंगति विश्लेषण' : 'AI Desk Scrutiny Report'}</span>
                    </div>
                    <p className="text-xs text-slate-700">{projectAi.neutralSummary}</p>

                    {projectAi.riskFlags?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-red-800">Risk & Audit Flags:</div>
                        {projectAi.riskFlags.map((f: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-red-900">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {projectAi.missingDocuments?.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-amber-900">Missing Documents:</div>
                        <ul className="mt-1 list-disc pl-4 text-xs text-amber-900">
                          {projectAi.missingDocuments.map((m: string) => (
                            <li key={m}>{DOC_TYPE_LABELS[m]?.[lang] || m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROJECT EVIDENCE ROOM (3-COLUMN COMPARISON) */}
      {tab === 'evidence' && (
        <div className="space-y-5">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
            <span>
              {lang === 'hi'
                ? 'चेतावनी: तकनीकी अधिकारी द्वारा भौतिक माप एवं परीक्षण अभिलेखों का सत्यापन अनिवार्य है। केवल फोटोग्राफ से आयाम, सामग्री गुणवत्ता या संरचनात्मक सुरक्षा सिद्ध नहीं होती।'
                : 'Technical Validation Notice: The authorised technical officer must validate all physical measurements. Photographs alone cannot prove dimensions, material quality, or structural safety.'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Work / Measurement Item</th>
                  <th className="px-4 py-3 bg-blue-50/50 text-[#0F2942]">
                    1. Sanctioned Project Info
                  </th>
                  <th className="px-4 py-3 bg-amber-50/50 text-amber-900">
                    2. Official Records (MB)
                  </th>
                  <th className="px-4 py-3 bg-emerald-50/50 text-emerald-900">
                    3. Actual Field Findings
                  </th>
                  <th className="px-4 py-3">Variance (Field vs Sanctioned)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project?.estimates?.length > 0 ? (
                  project.estimates.map((est: AnyObj) => {
                    const mb = project.measurements?.find(
                      (m: AnyObj) => m.itemName.toLowerCase() === est.itemName.toLowerCase()
                    );
                    const fld = latestReport?.measurements?.find(
                      (m: AnyObj) =>
                        m.estimateItemId === est.id ||
                        m.itemName.toLowerCase() === est.itemName.toLowerCase()
                    );
                    const diff =
                      fld && typeof fld.measuredQty === 'number'
                        ? Number((fld.measuredQty - est.sanctionedQty).toFixed(2))
                        : null;

                    return (
                      <tr key={est.id}>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {lang === 'hi' && est.itemNameHi ? est.itemNameHi : est.itemName}
                          <div className="text-[11px] font-normal text-slate-500">Unit: {est.unit}</div>
                        </td>
                        <td className="px-4 py-3 bg-blue-50/20 font-mono font-bold text-[#0F2942]">
                          {est.sanctionedQty} {est.unit}
                        </td>
                        <td className="px-4 py-3 bg-amber-50/20 font-mono font-semibold text-amber-900">
                          {mb ? `${mb.recordedQty} ${mb.unit} (${mb.mbReference})` : 'Not recorded'}
                        </td>
                        <td className="px-4 py-3 bg-emerald-50/20 font-mono font-bold text-emerald-900">
                          {fld ? `${fld.measuredQty} ${fld.unit}` : 'Pending field inspection'}
                          {fld?.notes && (
                            <div className="font-sans text-[11px] font-normal text-slate-600 mt-0.5">
                              {fld.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {diff === null ? (
                            <span className="text-slate-400">—</span>
                          ) : Math.abs(diff) > 0.05 ? (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">
                              {diff > 0 ? `+${diff}` : diff} {est.unit}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                              Match (0)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No sanctioned estimate items linked. Showing field measurements below if available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3-Column Photo & Evidence Comparison */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#0F2942] mb-2">
                1. Before / During Work Photos
              </h3>
              <div className="space-y-2">
                {(project?.documents || [])
                  .filter((d: AnyObj) => ['BEFORE_PHOTO', 'DURING_PHOTO'].includes(d.docType))
                  .map((d: AnyObj) => (
                    <div key={d.id} className="rounded border border-slate-200 p-1.5">
                      <img src={d.fileUrl} alt={d.title} className="h-36 w-full rounded object-cover" />
                      <div className="mt-1 text-[11px] text-slate-600">{d.title}</div>
                      <ImageAuthBadge
                        fileUrl={d.fileUrl}
                        context="project_document"
                        analyzeImage={analyzeImage}
                        imageAnalysis={imageAnalysis}
                        lang={lang}
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-amber-900 mb-2">
                2. Submitted Completion Photos
              </h3>
              <div className="space-y-2">
                {(project?.documents || [])
                  .filter((d: AnyObj) => d.docType === 'AFTER_PHOTO')
                  .map((d: AnyObj) => (
                    <div key={d.id} className="rounded border border-slate-200 p-1.5">
                      <img src={d.fileUrl} alt={d.title} className="h-36 w-full rounded object-cover" />
                      <div className="mt-1 text-[11px] text-slate-600">{d.title}</div>
                      <ImageAuthBadge
                        fileUrl={d.fileUrl}
                        context="project_document"
                        analyzeImage={analyzeImage}
                        imageAnalysis={imageAnalysis}
                        lang={lang}
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-emerald-900 mb-2">
                3. Current Field Inspection Evidence
              </h3>
              {latestReport ? (
                <div className="space-y-2">
                  <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                    <div><b>Field Officer:</b> {latestReport.fieldOfficer?.name}</div>
                    <div><b>GPS:</b> {latestReport.gpsLat?.toFixed(5)}, {latestReport.gpsLng?.toFixed(5)}</div>
                    <div className="mt-1">{latestReport.observations}</div>
                  </div>
                  {(latestReport.evidenceFiles || []).map((f: AnyObj) => (
                    <div key={f.id} className="rounded border border-slate-200 p-1.5">
                      <img src={f.fileUrl} alt={f.fileName} className="h-36 w-full rounded object-cover" />
                      <div className="mt-1 text-[11px] text-slate-600">{f.caption || f.fileName}</div>
                      <ImageAuthBadge
                        fileUrl={f.fileUrl}
                        context="field_inspection"
                        analyzeImage={analyzeImage}
                        imageAnalysis={imageAnalysis}
                        lang={lang}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400">No field inspection report submitted yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STAGE 2 & 3 - FIELD ASSIGNMENT & TECHNICAL DECISION */}
      {tab === 'decision' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Schedule Field Inspection */}
          <form
            onSubmit={handleScheduleInspection}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-[#0F2942]">
              {lang === 'hi' ? 'चरण 2: स्थल निरीक्षण निर्धारित करें' : 'Stage 2: Schedule Field Inspection'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'hi' ? 'क्षेत्रीय अधिकारी चुनें' : 'Assign Field Officer'}
              </label>
              <select
                value={selectedFieldOfficer}
                onChange={(e) => setSelectedFieldOfficer(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {fieldOfficers.map((fo) => (
                  <option key={fo.id} value={fo.id}>
                    {fo.name} ({fo.jurisdiction || 'Field'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'hi' ? 'निरीक्षण तिथि' : 'Scheduled Date'}
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'hi' ? 'निरीक्षण निर्देश' : 'Inspection Instructions'}
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Verify physical dimensions against MB and capture GPS photographs."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#14532D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#114223] disabled:opacity-50"
            >
              {lang === 'hi' ? 'निरीक्षण सौंपें' : 'Assign Field Inspection'}
            </button>
          </form>

          {/* Officer Decision Panel */}
          <form
            onSubmit={handleDecision}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-[#0F2942]">
              {lang === 'hi' ? 'चरण 3: अधिकारी समीक्षा एवं निर्णय' : 'Stage 3: Officer Review & Decision'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {lang === 'hi'
                ? 'सभी प्रशासनिक निर्णय अधिकृत अधिकारी द्वारा कारण सहित दर्ज किए जाने अनिवार्य हैं। (अंतिम निस्तारण केवल स्वीकृति अधिकारी द्वारा)'
                : 'All decisions require an authorised officer and mandatory reason. Final resolution/inquiry requires Approving Officer or Admin.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'hi' ? 'निर्णय प्रकार' : 'Decision Action'}
              </label>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="APPROVE_ACTION">Approve Action / Forward to Approving Authority</option>
                <option value="RETURN_FOR_EVIDENCE">Return for Additional Evidence</option>
                <option value="REQUEST_REINSPECTION">Request Reinspection</option>
                <option value="REJECT_COMPLAINT">Reject Unsupported Complaint</option>
                {(user?.role === 'APPROVING_OFFICER' || user?.role === 'ADMIN') && (
                  <>
                    <option value="APPROVE_COMPLETION">Approve Completion & Resolve</option>
                    <option value="RECORD_RESOLUTION">Record Final Resolution (Close Case)</option>
                    <option value="REFER_FOR_INQUIRY">Refer for Further Inquiry</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'hi' ? 'आधिकारिक कारण (अनिवार्य)' : 'Mandatory Administrative Reason *'}
              </label>
              <textarea
                required
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="State evidence reviewed and specific administrative action..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            {['APPROVE_COMPLETION', 'RECORD_RESOLUTION'].includes(decisionType) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'hi' ? 'नागरिक-सुरक्षित सारांश (ट्रैकिंग पृष्ठ हेतु)' : 'Public-Safe Resolution Summary'}
                </label>
                <textarea
                  rows={2}
                  value={publicSummary}
                  onChange={(e) => setPublicSummary(e.target.value)}
                  placeholder="Summary safe for public citizen tracking page (no internal notes or PII)..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2942] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a1d30] disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'निर्णय दर्ज करें' : 'Record Decision'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: IMMUTABLE AUDIT TRAIL */}
      {tab === 'audit' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0F2942] mb-4">
            {lang === 'hi' ? 'अपरिवर्तनीय केस ऑडिट इतिहास' : 'Immutable Case Audit Trail'}
          </h2>
          <div className="space-y-3">
            {(complaint.auditEvents || []).map((ev: AnyObj) => (
              <div key={ev.id} className="flex items-start gap-3 border-l-2 border-[#0F2942] pl-3.5 py-1">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#0F2942]">{ev.action}</span>
                    <span className="text-slate-500">by {ev.actorName}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {(ev.previousStatus || ev.newStatus) && (
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      {ev.previousStatus || '—'} → <b>{ev.newStatus || '—'}</b>
                    </div>
                  )}
                  {ev.reason && <p className="mt-0.5 text-xs text-slate-700">{ev.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

