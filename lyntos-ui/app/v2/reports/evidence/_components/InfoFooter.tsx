import React from 'react';
import { Shield, Scale, Lock } from 'lucide-react';

export function InfoFooter() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-[#0049AA]" />
            <h3 className="font-semibold text-[#2E2E2E]">Veri Bütünlüğü</h3>
          </div>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            Her belge SHA-256 hash ile korunur. Herhangi bir değişiklik anında tespit edilir.
            Tüm işlemler audit trail&apos;de kayıt altına alınır.
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#ECFDF5] border border-[#AAE8B8] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Scale className="w-6 h-6 text-[#00804D]" />
            <h3 className="font-semibold text-[#2E2E2E]">Yasal Uyumluluk</h3>
          </div>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            Tüm belgeler VUK, TTK ve SPK denetim standartlarına uygun şekilde
            kategorize edilir ve yasal referanslarla ilişkilendirilir.
          </p>
        </div>
      </div>

      <div className="bg-[#F5F6F8] border border-[#E5E5E5] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#969696] mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#5A5A5A]">Güvenlik ve Gizlilik</p>
            <p className="text-xs text-[#969696] mt-1">
              Kanıt paketi AES-256 şifreleme ile korunur. Sadece yetkili kullanıcılar erişebilir.
              Tüm indirme ve görüntüleme işlemleri kayıt altına alınır.
              Son 5 yıl boyunca VUK Md. 256 gereği muhafaza edilir.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
