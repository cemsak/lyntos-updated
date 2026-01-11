'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator } from 'lucide-react';

export default function HesaplamalarPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Hesaplamalar</h1>
          <p className="text-slate-600">Vergi, SGK ve diger mali hesaplama araclari</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Hesaplama Araclari
          </h2>
          <p className="text-slate-500 max-w-md">
            Vergi hesaplama, SGK prim hesaplama, amortisman hesaplama ve diger
            mali hesaplama araclari yakin zamanda aktif olacaktir.
          </p>
        </div>
      </div>
    </div>
  );
}
