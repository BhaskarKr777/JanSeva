'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Map as MapIcon,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  ArrowUpDown,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ISSUE_CATEGORIES, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/i18n';
import { daysBetween } from '@/lib/utils';
import {
  LeafletOverviewMap,
  MapComplaintItem,
  MapProjectItem,
} from '@/components/LeafletOverviewMap';

interface OfficerComplaint extends MapComplaintItem {
  village?: { name: string; nameHi: string } | null;
  assignedOfficer?: { name: string; nameHi: string | null } | null;
  linkedProject?: { projectCode: string; title: string } | null;
  createdAt: string;
  inManualTriage: boolean;
  relatedCount: number;
}

export default function OfficerDashboardPage() {
  const { lang, user, loadingUser } = useApp();
  const [complaints, setComplaints] = useState<OfficerComplaint[]>([]);
  const [projects, setProjects] = useState<MapProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'queue' | 'map'>('queue');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  useEffect(() => {
    if (loadingUser) return;
    async function load() {
      if (!user || !['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN', 'FIELD_OFFICER'].includes(user.role)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        fetch('/api/complaints', { cache: 'no-store' }),
        fetch('/api/projects', { cache: 'no-store' }),
      ]);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      setComplaints(cJson.complaints || []);
      setProjects(pJson.projects || []);
      setLoading(false);
    }
    void load();
  }, [user, loadingUser]);

  const metrics = useMemo(() => {
    const total = complaints.length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    const pending = complaints.filter((c) => !['RESOLVED', 'REJECTED'].includes(c.status)).length;
    const highPriority = complaints.filter(
      (c) => ['HIGH', 'URGENT'].includes(c.priority) && !['RESOLVED', 'REJECTED'].includes(c.status)
    ).length;
    const awaitingInspection = complaints.filter((c) =>
      ['INSPECTION_SCHEDULED', 'REINSPECTION_REQUESTED'].includes(c.status)
    ).length;
    const techReview = complaints.filter((c) =>
      ['TECHNICAL_REVIEW', 'INSPECTION_SUBMITTED'].includes(c.status)
    ).length;
    const returnedEvidence = complaints.filter((c) => c.status === 'RETURNED_FOR_EVIDENCE').length;
    const overdue = complaints.filter(
      (c) => !['RESOLVED', 'REJECTED'].includes(c.status) && daysBetween(c.createdAt) > 7
    ).length;

    return {
      total,
      pending,
      highPriority,
      awaitingInspection,
      techReview,
      returnedEvidence,
      resolved,
      overdue,
    };
  }, [complaints]);

  const filtered = useMemo(() => {
    const prioRank: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return complaints
      .filter((c) => {
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${c.referenceNumber} ${c.description || ''} ${c.gramPanchayat?.name || ''} ${
            c.village?.name || ''
          }`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return (prioRank[b.priority] || 0) - (prioRank[a.priority] || 0);
        if (sortBy === 'oldest')
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [complaints, statusFilter, priorityFilter, search, sortBy]);

  if (!loadingUser && (!user || user.role === 'CITIZEN')) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold text-[#0F2942]">
            {lang === 'hi' ? 'अधिकारी लॉगिन आवश्यक' : 'Officer Authentication Required'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {lang === 'hi'
              ? 'डैशबोर्ड देखने के लिए कृपया समीक्षा या स्वीकृति अधिकारी के रूप में लॉगिन करें।'
              : 'Please sign in as a Reviewing, Approving, or Admin officer to access the dashboard.'}
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-[#0F2942] px-5 py-2 text-sm font-semibold text-white"
          >
            {lang === 'hi' ? 'लॉगिन पृष्ठ पर जाएं' : 'Go to Login'}
          </Link>
        </div>
      </div>
    );
  }

  const catLabel = (key: string) => {
    const f = ISSUE_CATEGORIES.find((c) => c.key === key);
    return f ? f[lang] : key;
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 lg:w-60">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {lang === 'hi' ? 'अधिकारी कार्यक्षेत्र' : 'Officer Workspace'}
          </div>
          <button
            type="button"
            onClick={() => setView('queue')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              view === 'queue' ? 'bg-[#0F2942] text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>{lang === 'hi' ? 'प्राथमिकता कतार' : 'Priority Queue'}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              view === 'map' ? 'bg-[#0F2942] text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span>{lang === 'hi' ? 'अधिकारी मानचित्र' : 'Officer Map'}</span>
          </button>

          <div className="mt-4 border-t border-slate-100 pt-3 px-3">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
              {lang === 'hi' ? 'त्वरित फ़िल्टर' : 'Quick Queues'}
            </div>
            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => { setView('queue'); setStatusFilter('MANUAL_TRIAGE'); }}
                className="block w-full text-left py-1 text-amber-800 hover:underline"
              >
                • {lang === 'hi' ? 'मैन्युअल वर्गीकरण' : 'Manual Triage'} ({complaints.filter((c) => c.status === 'MANUAL_TRIAGE').length})
              </button>
              <button
                type="button"
                onClick={() => { setView('queue'); setStatusFilter('TECHNICAL_REVIEW'); }}
                className="block w-full text-left py-1 text-purple-800 hover:underline"
              >
                • {lang === 'hi' ? 'तकनीकी समीक्षा' : 'Technical Review'} ({metrics.techReview})
              </button>
              <button
                type="button"
                onClick={() => { setView('queue'); setStatusFilter('RETURNED_FOR_EVIDENCE'); }}
                className="block w-full text-left py-1 text-orange-800 hover:underline"
              >
                • {lang === 'hi' ? 'साक्ष्य हेतु वापस' : 'Returned for Evidence'} ({metrics.returnedEvidence})
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* 8 KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="text-xs text-slate-500">{lang === 'hi' ? 'कुल शिकायतें' : 'Total Complaints'}</div>
            <div className="mt-1 text-2xl font-bold text-[#0F2942]">{metrics.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="text-xs text-slate-500">{lang === 'hi' ? 'लंबित शिकायतें' : 'Pending Cases'}</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{metrics.pending}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              <span>{lang === 'hi' ? 'उच्च प्राथमिकता' : 'High / Urgent'}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-orange-700">{metrics.highPriority}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
              <span>{lang === 'hi' ? 'निरीक्षण प्रतीक्षित' : 'Awaiting Inspection'}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-indigo-700">{metrics.awaitingInspection}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="text-xs text-slate-500">{lang === 'hi' ? 'तकनीकी समीक्षा' : 'Technical Review'}</div>
            <div className="mt-1 text-2xl font-bold text-purple-700">{metrics.techReview}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <FileWarning className="h-3.5 w-3.5 text-orange-600" />
              <span>{lang === 'hi' ? 'साक्ष्य हेतु वापस' : 'Returned Evidence'}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-orange-700">{metrics.returnedEvidence}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>{lang === 'hi' ? 'निस्तारित' : 'Resolved'}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{metrics.resolved}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              <span>{lang === 'hi' ? 'समयसीमा पार (>7 दिन)' : 'Overdue (>7d)'}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-700">{metrics.overdue}</div>
          </div>
        </div>

        {view === 'map' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#0F2942]">
              {lang === 'hi'
                ? 'शिकायतें एवं स्वीकृत विकास परियोजना मानचित्र'
                : 'Assigned Complaints & Sanctioned Infrastructure Projects'}
            </h2>
            <LeafletOverviewMap
              complaints={filtered}
              projects={projects}
              lang={lang}
              officerMode
              heightClass="h-[520px]"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === 'hi' ? 'संदर्भ संख्या, गांव या विवरण खोजें...' : 'Search ref, village, or description...'}
                  className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-1.5 text-sm focus:border-[#0F2942] focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="ALL">{lang === 'hi' ? 'सभी प्राथमिकताएं' : 'All Priorities'}</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v[lang]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setSortBy((s) => (s === 'newest' ? 'priority' : s === 'priority' ? 'oldest' : 'newest'))
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>
                  {sortBy === 'priority'
                    ? lang === 'hi'
                      ? 'प्राथमिकता अनुसार'
                      : 'Sort: Priority'
                    : sortBy === 'oldest'
                    ? lang === 'hi'
                      ? 'सबसे पुराना पहले'
                      : 'Sort: Oldest'
                    : lang === 'hi'
                    ? 'नवीनतम पहले'
                    : 'Sort: Newest'}
                </span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{lang === 'hi' ? 'संदर्भ' : 'Ref #'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'श्रेणी' : 'Category'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'गांव / पंचायत' : 'Village / GP'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'तिथि' : 'Reported'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'प्राथमिकता' : 'Priority'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'विभाग' : 'Department'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'अधिकारी' : 'Officer'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'अवस्था' : 'Stage'}</th>
                    <th className="px-4 py-3">{lang === 'hi' ? 'लंबित दिन' : 'Days'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        {lang === 'hi' ? 'कोई शिकायत नहीं मिली।' : 'No matching complaints found.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const days = daysBetween(c.createdAt);
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-[#0F2942]">
                            <Link href={`/officer/cases/${c.id}`} className="hover:underline">
                              {c.referenceNumber}
                            </Link>
                            {c.linkedProject && (
                              <div className="mt-0.5 text-[10px] font-sans font-medium text-emerald-800">
                                🔗 {c.linkedProject.projectCode}
                              </div>
                            )}
                            {c.relatedCount > 0 && (
                              <div className="mt-0.5 text-[10px] font-sans font-medium text-amber-800">
                                👥 +{c.relatedCount} related
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            <Link href={`/officer/cases/${c.id}`} className="block">
                              {catLabel(c.category)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{lang === 'hi' ? c.village?.nameHi : c.village?.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {lang === 'hi' ? c.gramPanchayat?.nameHi : c.gramPanchayat?.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                                PRIORITY_LABELS[c.priority]?.color || ''
                              }`}
                            >
                              {PRIORITY_LABELS[c.priority]?.[lang] || c.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.assignedDept
                              ? lang === 'hi'
                                ? c.assignedDept.nameHi
                                : c.assignedDept.name
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {c.assignedOfficer?.name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                                STATUS_LABELS[c.status]?.color || ''
                              }`}
                            >
                              {STATUS_LABELS[c.status]?.[lang] || c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            <span className={days > 7 && !['RESOLVED', 'REJECTED'].includes(c.status) ? 'text-red-700' : ''}>
                              {days}d
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

