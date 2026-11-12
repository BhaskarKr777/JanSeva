import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { AppProvider } from '@/components/AppProvider';
import { TopNav } from '@/components/TopNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
});

export const metadata: Metadata = {
  title: 'JanSeva | जनसेवा — Jharkhand Citizen Reporting & Field Verification',
  description:
    'Citizen Reporting, Ground-Level Verification and Evidence-Based Government Action Platform (Simulated Demo)',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" className={`${inter.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
        <AppProvider>
          <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
            <TopNav />
          </Suspense>
          <main className="min-h-[calc(100vh-88px)]">
            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>
              {children}
            </Suspense>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
