'use client';

import React from 'react';
import {
  CheckCircle2,
  Info,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { UploadResult } from '../types';
import { getFileTypeConfig } from '../constants';

interface UploadSuccessProps {
  result: UploadResult;
  onGoToDashboard: () => void;
}

export function UploadSuccess({ result, onGoToDashboard }: UploadSuccessProps) {
  const stats = result.statistics;

  return (
    <div className="space-y-4">
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#00A651]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#00804D] text-lg">Yükleme Tamamlandı!</h3>
            <p className="text-sm text-[#00804D]">
              {stats.total_files} dosya işlendi, {stats.total_parsed_rows} kayıt veritabanına yazıldı
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#00A651]">Dönem</p>
            <p className="font-medium text-[#00804D]">{result.period}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-sm text-[#969696]">Toplam Dosya</p>
          <p className="text-2xl font-bold text-[#2E2E2E]">{stats.total_files}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-sm text-[#969696]">Başarılı</p>
          <p className="text-2xl font-bold text-[#00804D]">{stats.new_files}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-sm text-[#969696]">Toplam Kayıt</p>
          <p className="text-2xl font-bold text-[#0049AA]">{stats.total_parsed_rows}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
          <p className="text-sm text-[#969696]">Oturum ID</p>
          <p className="text-sm font-mono font-bold text-[#5A5A5A] truncate">{result.session_id}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
        <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
          <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
            <Info className="w-5 h-5 text-[#0049AA]" />
            İşlenen Dosyalar ({result.files.length})
          </h2>
        </div>

        <div className="divide-y divide-[#E5E5E5] max-h-[400px] overflow-y-auto">
          {result.files.map((file, index) => {
            const config = getFileTypeConfig(file.doc_type);
            const IconComponent = config.icon;
            const isSuccess = file.status === 'OK';

            return (
              <div key={index} className="flex items-center gap-3 p-4 hover:bg-[#F5F6F8]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color.split(' ')[1]}`}>
                  <IconComponent className={`w-5 h-5 ${config.color.split(' ')[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2E2E2E] truncate">{file.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 text-xs rounded ${config.color}`}>
                      {config.label}
                    </span>
                    {file.parsed_row_count > 0 && (
                      <span className="text-xs text-[#969696]">
                        {file.parsed_row_count} satır
                      </span>
                    )}
                    {file.message && (
                      <span className="text-xs text-[#969696]">
                        {file.message}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                  ) : file.is_duplicate ? (
                    <Clock className="w-5 h-5 text-[#FFB114]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#969696]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-[#F5F6F8] border-t border-[#E5E5E5] flex items-center justify-between">
          <p className="text-sm text-[#5A5A5A]">
            <strong className="text-[#00804D]">{stats.new_files}</strong> dosya başarıyla işlendi
          </p>
          <button
            onClick={onGoToDashboard}
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors flex items-center gap-2"
          >
            Dashboard&apos;a Git
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
