'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Lang } from '@/lib/i18n';

export interface AuthUser {
  id: string;
  name: string;
  nameHi: string | null;
  email: string;
  role: 'CITIZEN' | 'FIELD_OFFICER' | 'REVIEWING_OFFICER' | 'APPROVING_OFFICER' | 'ADMIN';
  designation: string | null;
  designationHi: string | null;
  departmentId: string | null;
  department?: { id: string; name: string; nameHi: string; code: string } | null;
}

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  user: AuthUser | null;
  loadingUser: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hi');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    void (async () => {
      const saved = localStorage.getItem('janseva_lang');
      if (saved === 'en' || saved === 'hi') setLangState(saved);
      await refreshUser();
    })();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('janseva_lang', l);
  };

  const toggleLang = () => setLang(lang === 'hi' ? 'en' : 'hi');

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, toggleLang, user, loadingUser, refreshUser, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

