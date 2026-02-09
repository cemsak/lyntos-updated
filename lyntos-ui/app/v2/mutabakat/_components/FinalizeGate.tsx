'use client';
import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';

interface FinalizeGateProps {
  bilinmiyorSayisi: number;
  toplamFarkli: number;
  onFinalize: () => Promise<void>;
}

/**
 * Sonuclandirma kapisi.
 *
 * BILINMIYOR > 0 → Buton disabled, uyari gosterilir.
 * BILINMIYOR === 0 → Buton aktif, onay API'si cagrilabilir.
 */
export function FinalizeGate({
  bilinmiyorSayisi,
  toplamFarkli,
  onFinalize,
}: FinalizeGateProps) {
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);

  const canFinalize = bilinmiyorSayisi === 0 && toplamFarkli > 0;

  const handleFinalize = async () => {
    if (!canFinalize) return;
    setLoading(true);
    try {
      await onFinalize();
      setFinalized(true);
    } catch {
      // Error handling is in parent
    } finally {
      setLoading(false);
    }
  };

  if (toplamFarkli === 0) return null;

  return (
    <div className="space-y-3">
      {/* Bilinmiyor Uyarisi */}
      {bilinmiyorSayisi > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FA841E] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#E67324]">
                {bilinmiyorSayisi} satirda karar bekleniyor
              </p>
              <p className="text-sm text-[#E67324] mt-1">
                Sonuclandirma icin tum satirlar RESMI veya DEFTER_DISI olarak siniflandirilmalidir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Butonu */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFinalize}
          disabled={!canFinalize || loading || finalized}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            finalized
              ? 'bg-[#00A651] text-white'
              : canFinalize
                ? 'bg-[#0049AA] text-white hover:bg-[#00287F]'
                : 'bg-[#F5F6F8] text-[#B4B4B4] cursor-not-allowed'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : finalized ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : canFinalize ? (
            <Unlock className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {finalized ? 'Sonuclandirildi' : 'Sonuclandir'}
        </button>

        {canFinalize && !finalized && (
          <span className="text-xs text-[#969696]">
            Tum satirlar siniflandirildi. Sonuclandirma icin tiklayin.
          </span>
        )}
      </div>
    </div>
  );
}
