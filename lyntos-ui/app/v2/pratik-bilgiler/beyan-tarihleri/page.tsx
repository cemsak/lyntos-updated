'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function BeyanTarihleriPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/v2/pratik-bilgiler"
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Beyan Tarihleri</h1>
          <p className="text-slate-600">Beyanname ve bildirim son tarihleri</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Beyan Takvimi
          </h2>
          <p className="text-slate-500 max-w-md">
            KDV, muhtasar, gecici vergi, kurumlar vergisi beyanname
            son tarihleri ve diger bildirim tarihleri yakin zamanda eklenecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
