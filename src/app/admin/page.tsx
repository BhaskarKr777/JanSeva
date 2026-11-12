'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, ShieldAlert, Plus, BarChart3 } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ISSUE_CATEGORIES, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function AdminConsolePage() {
  const { lang, user, loadingUser } = useApp();
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rules' | 'departments' | 'users' | 'jurisdictions'>('rules');

  // New Rule form
  const [ruleName, setRuleName] = useState('');
  const [ruleCat, setRuleCat] = useState('DAMAGED_ROAD');
  const [ruleDept, setRuleDept] = useState('');
  const [ruleBlock, setRuleBlock] = useState('');
  const [rulePriority, setRulePriority] = useState('MEDIUM');

  // New Dept form
  const [deptName, setDeptName] = useState('');
  const [deptNameHi, setDeptNameHi] = useState('');
  const [deptCode, setDeptCode] = useState('');

  const loadAdmin = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      if (json.departments?.length && !ruleDept) setRuleDept(json.departments[0].id);
    }
    setLoading(false);
  }, [user, ruleDept]);

  useEffect(() => {
    if (!loadingUser) {
      void (async () => {
        await loadAdmin();
      })();
    }
  }, [loadingUser, loadAdmin]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_RULE',
        name: ruleName,
        categoryKey: ruleCat,
        departmentId: ruleDept,
        blockId: ruleBlock || null,
        defaultPriority: rulePriority,
      }),
    });
    setRuleName('');
    await loadAdmin();
  };

  const handleToggleRule = async (id: string, active: boolean) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'TOGGLE_RULE', id, active: !active }),
    });
    await loadAdmin();
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DEPARTMENT',
        name: deptName,
        nameHi: deptNameHi || deptName,
        code: deptCode,
      }),
    });
    setDeptName('');
    setDeptNameHi('');
    setDeptCode('');
    await loadAdmin();
  };

  if (!loadingUser && (!user || user.role !== 'ADMIN')) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold text-[#0F2942]">Administrator Access Required</h1>
          <p className="mt-1 text-xs text-slate-600">
            Sign in with <b>admin@janseva.demo</b> to configure routing rules, departments, and users.
          </p>
          <Link href="/login" className="mt-4 inline-block rounded-lg bg-[#0F2942] px-5 py-2 text-xs font-semibold text-white">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2.5">
        <Settings className="h-6 w-6 text-[#0F2942]" />
        <div>
          <h1 className="text-xl font-bold text-[#0F2942]">
            {lang === 'hi' ? 'प्रणाली प्रशासन एवं रूटिंग विन्यास' : 'System Administration & Routing Configuration'}
          </h1>
          <p className="text-xs text-slate-500">
            Configure departments, blocks, Gram Panchayats, issue categories, routing rules, and view analytics.
          </p>
        </div>
      </div>

      {/* System-wide Analytics */}
      {data?.statsByStatus && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 mb-3">
            <BarChart3 className="h-4 w-4 text-[#0F2942]" />
            <span>System-Wide Status Breakdown</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.statsByStatus.map((s: AnyObj) => (
              <div key={s.status} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">
                  {STATUS_LABELS[s.status]?.[lang] || s.status}:
                </span>{' '}
                <span className="font-bold text-[#0F2942]">{s._count.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'rules', label: 'Routing Rules' },
          { key: 'departments', label: 'Departments' },
          { key: 'users', label: 'Users & Roles' },
          { key: 'jurisdictions', label: 'Blocks, GPs & Categories' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as typeof tab)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              tab === t.key ? 'bg-[#0F2942] text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="text-xs text-slate-500">Loading configuration...</div>
      ) : tab === 'rules' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-[#0F2942] mb-3">Configured Routing Rules</h2>
            <div className="space-y-2">
              {data.rules.map((r: AnyObj) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{r.name}</div>
                    <div className="text-slate-500 mt-0.5">
                      Category: <b>{r.categoryKey}</b> → Dept: <b>{r.department.name}</b> • Priority: {r.defaultPriority} • SLA: {r.slaDays}d
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(r.id, r.active)}
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                      r.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {r.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateRule} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 h-fit">
            <h3 className="text-sm font-bold text-[#0F2942] flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Routing Rule
            </h3>
            <input
              type="text"
              required
              placeholder="Rule Name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
            />
            <select value={ruleCat} onChange={(e) => setRuleCat(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs">
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.en}</option>
              ))}
            </select>
            <select value={ruleDept} onChange={(e) => setRuleDept(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs">
              {data.departments.map((d: AnyObj) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select value={ruleBlock} onChange={(e) => setRuleBlock(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs">
              <option value="">All Blocks (Global Rule)</option>
              {data.blocks.map((b: AnyObj) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select value={rulePriority} onChange={(e) => setRulePriority(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs">
              {Object.keys(PRIORITY_LABELS).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button type="submit" className="w-full rounded-lg bg-[#0F2942] py-2 text-xs font-semibold text-white">
              Save Routing Rule
            </button>
          </form>
        </div>
      ) : tab === 'departments' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-[#0F2942] mb-2">Departments</h2>
            {data.departments.map((d: AnyObj) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-3 text-xs">
                <span className="font-mono font-bold text-[#0F2942] mr-2">[{d.code}]</span>
                <span className="font-semibold">{d.name}</span> / <span className="text-slate-600">{d.nameHi}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleCreateDept} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 h-fit">
            <h3 className="text-sm font-bold text-[#0F2942]">Add Department</h3>
            <input type="text" required placeholder="Code (e.g. ENERGY)" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs" />
            <input type="text" required placeholder="Department Name (English)" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs" />
            <input type="text" placeholder="Department Name (Hindi)" value={deptNameHi} onChange={(e) => setDeptNameHi(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs" />
            <button type="submit" className="w-full rounded-lg bg-[#0F2942] py-2 text-xs font-semibold text-white">
              Create Department
            </button>
          </form>
        </div>
      ) : tab === 'users' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Jurisdiction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u: AnyObj) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-semibold">{u.name}</td>
                  <td className="px-3 py-2 font-mono">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.department?.name || 'All'}</td>
                  <td className="px-3 py-2">{u.jurisdiction || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-[#0F2942]">Demo Gram Panchayats (Simulated)</h2>
            {data.gramPanchayats.map((gp: AnyObj) => (
              <div key={gp.id} className="rounded border border-slate-200 p-2.5 text-xs flex justify-between">
                <div>
                  <b>{gp.name}</b> ({gp.nameHi})
                  <div className="text-[11px] text-slate-500">{gp.block.name}</div>
                </div>
                <span className="font-mono text-[11px] text-slate-500">{gp.lat}, {gp.lng}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-[#0F2942]">Configured Issue Categories</h2>
            {data.categories.map((c: AnyObj) => (
              <div key={c.id} className="rounded border border-slate-200 p-2.5 text-xs flex justify-between">
                <span>{c.labelEn} / {c.labelHi}</span>
                <span className="font-semibold text-emerald-700">{c.active ? 'Active' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

