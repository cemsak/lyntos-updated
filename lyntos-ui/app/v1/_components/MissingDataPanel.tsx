'use client';

import { useState } from 'react';

interface MissingDataItem {
  module: string;
  reason: string;
  missing_data: string[];
  required_actions: string[];
  deadline?: string;
  priority?: string;
}

interface MissingDataPanelProps {
  quarterlyTax: any;
  crossCheck: any;
  corporateTax: any;
}

export default function MissingDataPanel({ quarterlyTax, crossCheck, corporateTax }: MissingDataPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Collect all missing data from different sources
  const allMissing: MissingDataItem[] = [];

  // Check quarterlyTax
  if (quarterlyTax?.ok === false && quarterlyTax?.missing_data && quarterlyTax.missing_data.length > 0) {
    allMissing.push({
      module: 'quarterly_tax',
      reason: quarterlyTax.reason_tr || quarterlyTax.reason || "Veri eksik",
      missing_data: quarterlyTax.missing_data,
      required_actions: quarterlyTax.required_actions || [],
      deadline: quarterlyTax.deadline,
      priority: quarterlyTax.priority || "medium"
    });
  }

  // Check crossCheck
  if (crossCheck?.ok === false && crossCheck?.missing_data && crossCheck.missing_data.length > 0) {
    allMissing.push({
      module: 'cross_check',
      reason: crossCheck.reason_tr || crossCheck.reason || "Veri eksik",
      missing_data: crossCheck.missing_data,
      required_actions: crossCheck.required_actions || [],
      deadline: crossCheck.deadline,
      priority: crossCheck.priority || "medium"
    });
  }

  // Check corporateTax
  if (corporateTax?.ok === false && corporateTax?.missing_data && corporateTax.missing_data.length > 0) {
    allMissing.push({
      module: 'corporate_tax',
      reason: corporateTax.reason_tr || corporateTax.reason || "Veri eksik",
      missing_data: corporateTax.missing_data,
      required_actions: corporateTax.required_actions || [],
      deadline: corporateTax.deadline,
      priority: corporateTax.priority || "medium"
    });
  }

  // Don't render if no missing data
  if (allMissing.length === 0) {
    return null;
  }

  function calculateDaysRemaining(deadline: string): number {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function getModuleLabel(module: string): string {
    const labels: Record<string, string> = {
      'quarterly_tax': 'Gecici Vergi',
      'corporate_tax': 'Kurumlar Vergisi',
      'cross_check': 'Capraz Kontrol',
      'kurgan_risk': 'KURGAN Risk',
      'vergi_uyum': 'Vergi Uyum',
      'veri_kalitesi': 'Veri Kalitesi',
      'enflasyon': 'Enflasyon Muhasebesi'
    };
    return labels[module] || module.toUpperCase();
  }

  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">!</span>
          <h2 className="text-lg font-bold text-red-900">
            Eksik Veriler ({allMissing.length} modul)
          </h2>
        </div>
        <button
          onClick={() => setExpandedIndex(expandedIndex === null ? 0 : null)}
          className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          {expandedIndex === null ? 'Tumunu Gor' : 'Daralt'}
        </button>
      </div>

      <div className="space-y-3">
        {allMissing.map((item, index) => {
          const daysRemaining = item.deadline ? calculateDaysRemaining(item.deadline) : null;

          return (
            <div
              key={index}
              className={`bg-white border rounded-lg p-4 ${
                item.priority === 'high' ? 'border-red-400' :
                item.priority === 'medium' ? 'border-orange-400' :
                'border-yellow-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Module name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {getModuleLabel(item.module)}
                    </span>
                    {item.priority === 'high' && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        ACIL
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-gray-700 mb-3">{item.reason}</p>

                  {/* Missing docs */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Eksik Belgeler ({item.missing_data.length}):
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {item.missing_data.map((doc, i) => (
                        <li key={i} className="font-mono">* {doc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Required actions */}
                  {item.required_actions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Yapilacaklar:
                      </p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        {item.required_actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Deadline */}
                  {item.deadline && daysRemaining !== null && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-semibold ${
                        daysRemaining < 3 ? 'text-red-700' :
                        daysRemaining < 7 ? 'text-orange-700' :
                        'text-gray-700'
                      }`}>
                        Son Tarih: {new Date(item.deadline).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="text-gray-600">
                        ({daysRemaining > 0 ? `${daysRemaining} gun kaldi` : 'SURESI DOLDU'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <button
                  onClick={() => alert('Dosya yukleme ozelligi yakinda eklenecek')}
                  className="ml-4 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap"
                >
                  Dosya Yukle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-red-200">
        <p className="text-xs text-red-800">
          <strong>Toplam:</strong> {allMissing.reduce((acc, item) => acc + item.missing_data.length, 0)} eksik belge
          {allMissing.some(item => item.priority === 'high') && (
            <span className="ml-2 font-semibold">* ACIL OLANLAR VAR!</span>
          )}
        </p>
      </div>
    </div>
  );
}
