'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Card } from '../_components/shared/Card';
import { Badge } from '../_components/shared/Badge';

export default function MutabakatPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mutabakat Kontrolu</h1>
            <p className="text-slate-600">Cross-check ve mutabakat islemleri</p>
          </div>
        </div>

        {/* Content */}
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Mutabakat Modulu
            </h2>
            <p className="text-slate-500 mb-6 max-w-md">
              Cross-check ve mutabakat modulu Sprint 7'de aktif olacaktir.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Dashboard'a Don
            </button>
          </div>
        </Card>

        {/* Sprint Info */}
        <div className="mt-4 text-center">
          <Badge variant="info">Sprint 7'de aktif olacak</Badge>
        </div>
      </div>
    </div>
  );
}
