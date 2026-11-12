'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  MapPin,
  Search,
  LayoutDashboard,
  ClipboardCheck,
  Settings,
  Languages,
  LogIn,
  LogOut,
  FilePlus2,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { UI_COPY, ROLE_LABELS } from '@/lib/i18n';

export function TopNav() {
  const { lang, toggleLang, user, logout } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const t = UI_COPY[lang];

  const isOfficer =
    user && ['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN'].includes(user.role);
  const isField = user && ['FIELD_OFFICER', 'ADMIN'].includes(user.role);
  const isAdmin = user && user.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinkClass = (href: string) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === href || (href !== '/' && pathname.startsWith(href))
        ? 'bg-[#0F2942] text-white'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1 text-center text-xs font-medium text-amber-900">
        {t.simBanner}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F2942] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#0F2942]">
                {t.brand}
              </span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 border border-emerald-200">
                Jharkhand Demo
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-500 sm:block">{t.tagline}</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/" className={navLinkClass('/')}>
            <FilePlus2 className="h-4 w-4" />
            <span>{t.navReport}</span>
          </Link>
          <Link href="/track" className={navLinkClass('/track')}>
            <Search className="h-4 w-4" />
            <span>{t.navTrack}</span>
          </Link>
          <Link href="/map" className={navLinkClass('/map')}>
            <MapPin className="h-4 w-4" />
            <span>{t.navMap}</span>
          </Link>
          {isOfficer && (
            <Link href="/officer" className={navLinkClass('/officer')}>
              <LayoutDashboard className="h-4 w-4" />
              <span>{t.navOfficer}</span>
            </Link>
          )}
          {isField && (
            <Link href="/field" className={navLinkClass('/field')}>
              <ClipboardCheck className="h-4 w-4" />
              <span>{t.navField}</span>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={navLinkClass('/admin')}>
              <Settings className="h-4 w-4" />
              <span>{t.navAdmin}</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Switch Language / भाषा बदलें"
          >
            <Languages className="h-3.5 w-3.5 text-[#0F2942]" />
            <span>{lang === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right md:block">
                <div className="text-xs font-semibold text-slate-800">
                  {lang === 'hi' && user.nameHi ? user.nameHi : user.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {ROLE_LABELS[user.role]?.[lang] || user.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.navLogout}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#114223]"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t.navLogin}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

