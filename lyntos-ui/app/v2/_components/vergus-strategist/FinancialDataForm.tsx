'use client';

/**
 * Financial Data Input Form
 * Sprint 9.0 - LYNTOS V2
 *
 * Form for entering client financial data for VERGUS analysis.
 */

import React, { useState } from 'react';
import { Calculator, Building2, Users, Globe, Factory } from 'lucide-react';
import type { FinancialDataInput } from './types';

interface FinancialDataFormProps {
  onSubmit: (data: Partial<FinancialDataInput>) => void;
  isLoading: boolean;
}

export function FinancialDataForm({
  onSubmit,
  isLoading,
}: FinancialDataFormProps) {
  const [formData, setFormData] = useState<Partial<FinancialDataInput>>({
    toplam_hasilat: 0,
    ihracat_hasilat: 0,
    kv_matrahi: 0,
    hesaplanan_kv: 0,
    personel_sayisi: 0,
    arge_personel: 0,
    ortalama_maas: 22104,
    uretim_faaliyeti: false,
    sanayi_sicil: false,
    teknokent: false,
    arge_merkezi: false,
    yatirim_plani: false,
    istirak_temettu: 0,
    yurt_disi_hizmet: 0,
  });

  const handleChange = (
    field: keyof FinancialDataInput,
    value: number | boolean | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('tr-TR').format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Revenue Section */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-4">
        <h3 className="text-[14px] font-semibold text-[#1a1f36] dark:text-white mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#635bff]" />
          Gelir Bilgileri
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Toplam Hasilat (TL)
            </label>
            <input
              type="number"
              value={formData.toplam_hasilat || ''}
              onChange={(e) =>
                handleChange('toplam_hasilat', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Ihracat Hasilati (TL)
            </label>
            <input
              type="number"
              value={formData.ihracat_hasilat || ''}
              onChange={(e) =>
                handleChange('ihracat_hasilat', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              KV Matrahi (TL)
            </label>
            <input
              type="number"
              value={formData.kv_matrahi || ''}
              onChange={(e) =>
                handleChange('kv_matrahi', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Hesaplanan KV (TL)
            </label>
            <input
              type="number"
              value={formData.hesaplanan_kv || ''}
              onChange={(e) =>
                handleChange('hesaplanan_kv', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-4">
        <h3 className="text-[14px] font-semibold text-[#1a1f36] dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#635bff]" />
          Personel Bilgileri
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Toplam Personel
            </label>
            <input
              type="number"
              value={formData.personel_sayisi || ''}
              onChange={(e) =>
                handleChange('personel_sayisi', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Ar-Ge Personeli
            </label>
            <input
              type="number"
              value={formData.arge_personel || ''}
              onChange={(e) =>
                handleChange('arge_personel', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Ort. Maas (TL)
            </label>
            <input
              type="number"
              value={formData.ortalama_maas || ''}
              onChange={(e) =>
                handleChange('ortalama_maas', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="22104"
            />
          </div>
        </div>
      </div>

      {/* Activity Flags */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-4">
        <h3 className="text-[14px] font-semibold text-[#1a1f36] dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#635bff]" />
          Faaliyet Ozellikleri
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'uretim_faaliyeti', label: 'Uretim Faaliyeti Var' },
            { key: 'sanayi_sicil', label: 'Sanayi Sicil Belgesi' },
            { key: 'teknokent', label: 'Teknokent\'te Faaliyet' },
            { key: 'arge_merkezi', label: 'Ar-Ge Merkezi Var' },
            { key: 'yatirim_plani', label: 'Yatirim Plani Var' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={
                  formData[key as keyof FinancialDataInput] as boolean || false
                }
                onChange={(e) =>
                  handleChange(
                    key as keyof FinancialDataInput,
                    e.target.checked
                  )
                }
                className="w-4 h-4 rounded border-[#e3e8ee] dark:border-[#2d3343] text-[#635bff] focus:ring-[#635bff]/20"
              />
              <span className="text-[12px] text-[#1a1f36] dark:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Additional Income */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-4">
        <h3 className="text-[14px] font-semibold text-[#1a1f36] dark:text-white mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#635bff]" />
          Diger Gelirler
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Istirak Temettuleri (TL)
            </label>
            <input
              type="number"
              value={formData.istirak_temettu || ''}
              onChange={(e) =>
                handleChange('istirak_temettu', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#697386] mb-1">
              Yurt Disi Hizmet (TL)
            </label>
            <input
              type="number"
              value={formData.yurt_disi_hizmet || ''}
              onChange={(e) =>
                handleChange('yurt_disi_hizmet', Number(e.target.value))
              }
              className="w-full px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 text-[14px] font-medium text-white bg-[#635bff] hover:bg-[#5851ea] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analiz Yapiliyor...
          </>
        ) : (
          <>
            <Calculator className="w-4 h-4" />
            Vergi Optimizasyon Analizi Yap
          </>
        )}
      </button>
    </form>
  );
}
