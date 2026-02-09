'use client';

/**
 * Kontrol Modal - Dashboard V3
 * Vergi kontrolleri için onay modalı
 */

interface KontrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  kontrolId: string;
  kontrolBaslik: string;
  clientId?: string;
  period?: string;
  onKontrolBaslat?: (kontrolId: string) => void;
}

export function KontrolModal({
  isOpen,
  onClose,
  kontrolId,
  kontrolBaslik,
  clientId,
  period,
  onKontrolBaslat,
}: KontrolModalProps) {
  if (!isOpen) return null;

  const handleBaslat = () => {
    onKontrolBaslat?.(kontrolId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kontrol-modal-title"
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl animate-slide-up"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        <h2 id="kontrol-modal-title" className="text-xl font-bold text-[#2E2E2E] mb-2">{kontrolBaslik}</h2>
        <p className="text-[#5A5A5A] mb-6">
          Bu kontrol için gerekli veriler analiz edilecek. Devam etmek istiyor musunuz?
        </p>
        <div className="bg-[#F5F6F8] rounded-xl p-4 mb-6">
          <p className="text-sm text-[#5A5A5A]">
            <strong>Kontrol ID:</strong> {kontrolId}
          </p>
          {clientId && (
            <p className="text-sm text-[#5A5A5A] mt-1">
              <strong>Mükellef:</strong> {clientId}
            </p>
          )}
          {period && (
            <p className="text-sm text-[#5A5A5A] mt-1">
              <strong>Dönem:</strong> {period}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#B4B4B4] rounded-xl hover:bg-[#F5F6F8] transition-colors"
          >
            Iptal
          </button>
          <button
            onClick={handleBaslat}
            className="px-4 py-2 bg-gradient-to-r from-[#0078D0] to-[#0078D0] text-white rounded-xl hover:shadow-lg transition-all"
          >
            Kontrolu Baslat
          </button>
        </div>
      </div>
    </div>
  );
}

export default KontrolModal;
