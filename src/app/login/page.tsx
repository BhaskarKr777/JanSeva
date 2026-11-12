'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

const DEMO_ACCOUNTS = [
  { role: 'Reviewing Officer', email: 'reviewer@janseva.demo', redirect: '/officer', desc: 'Desk scrutiny, assign field inspections, review evidence' },
  { role: 'Approving Officer', email: 'approver@janseva.demo', redirect: '/officer', desc: 'Final approvals, inquiry referrals, resolutions' },
  { role: 'Field Officer (JE)', email: 'field@janseva.demo', redirect: '/field', desc: 'GPS site verification, measurements, Hindi voice notes' },
  { role: 'Field Officer 2 (Bundu)', email: 'field2@janseva.demo', redirect: '/field', desc: 'MGNREGA & Bundu block inspections' },
  { role: 'System Administrator', email: 'admin@janseva.demo', redirect: '/admin', desc: 'Routing rules, departments, users & analytics' },
  { role: 'Citizen Demo', email: 'citizen@janseva.demo', redirect: '/', desc: 'Submit & track village reports' },
];

export default function LoginPage() {
  const { lang, refreshUser } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doLogin = async (loginEmail: string, loginPassword: string, redirectPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        await refreshUser();
        if (redirectPath) {
          router.push(redirectPath);
        } else if (data.user.role === 'FIELD_OFFICER') {
          router.push('/field');
        } else if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else if (data.user.role === 'CITIZEN') {
          router.push('/');
        } else {
          router.push('/officer');
        }
      }
    } catch {
      setError('Network error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-[#0F2942]">
            <ShieldCheck className="h-6 w-6" />
            <h1 className="text-xl font-bold">
              {lang === 'hi' ? 'अधिकारी एवं उपयोगकर्ता लॉगिन' : 'Officer & Role Login'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lang === 'hi'
              ? 'भूमिका-आधारित पहुँच नियंत्रण (RBAC) के साथ जनसेवा पोर्टल में प्रवेश करें।'
              : 'Sign in with role-based credentials to access Officer, Field, or Admin workflows.'}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(email, password);
            }}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@janseva.demo"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0F2942] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0F2942] focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1d30]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{lang === 'hi' ? 'लॉगिन करें' : 'Sign In'}</span>
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#14532D]">
            <KeyRound className="h-5 w-5" />
            <h2 className="text-base font-bold">
              {lang === 'hi' ? 'त्वरित डेमो खाते (Password: Demo@123)' : 'Quick Demo Accounts (Password: Demo@123)'}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lang === 'hi'
              ? 'परीक्षण के लिए किसी भी भूमिका पर क्लिक करें।'
              : 'Click any role below to sign in immediately for demonstration.'}
          </p>

          <div className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail(acc.email);
                  setPassword('Demo@123');
                  doLogin(acc.email, 'Demo@123', acc.redirect);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-left transition-colors hover:border-[#0F2942] hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F2942]">{acc.role}</span>
                  <span className="font-mono text-[11px] text-slate-500">{acc.email}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-600">{acc.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

