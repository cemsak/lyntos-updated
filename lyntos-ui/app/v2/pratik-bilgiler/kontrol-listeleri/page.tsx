'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, ChevronRight, X, Download, Check, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useToast } from '../../_components/shared/Toast';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';

interface KontrolMaddesi {
  id: string;
  text: string;
  checked: boolean;
}

interface KontrolListesi {
  id: string;
  name: string;
  description: string;
  category: 'zorunlu' | 'istege-bagli';
  itemCount: number;
  items: KontrolMaddesi[];
}

const KONTROL_LISTELERI: KontrolListesi[] = [
  {
    id: 'donem-sonu',
    name: 'Dönem Sonu Kapanış',
    description: 'Yıl sonu kapanış işlemleri kontrol listesi',
    category: 'zorunlu',
    itemCount: 24,
    items: [
      { id: '1', text: 'Kasa sayımı yapıldı mı?', checked: false },
      { id: '2', text: 'Banka mutabakatları alındı mı?', checked: false },
      { id: '3', text: 'Stok sayımı yapıldı mı?', checked: false },
      { id: '4', text: 'Alacak yaşlandırması kontrol edildi mi?', checked: false },
      { id: '5', text: 'Borç yaşlandırması kontrol edildi mi?', checked: false },
      { id: '6', text: 'Amortisman kayıtları tamamlandı mı?', checked: false },
      { id: '7', text: 'Şüpheli alacak karşılıkları ayrıldı mı?', checked: false },
      { id: '8', text: 'Kıdem tazminatı karşılığı hesaplandı mı?', checked: false },
      { id: '9', text: 'Dönem sonu değerleme yapıldı mı?', checked: false },
      { id: '10', text: 'Gelir/Gider tahakkukları kaydedildi mi?', checked: false },
      { id: '11', text: 'KDV hesapları mutabık mı?', checked: false },
      { id: '12', text: 'Stopaj hesapları kontrol edildi mi?', checked: false },
    ]
  },
  {
    id: 'gecici-vergi',
    name: 'Geçici Vergi Beyanı',
    description: 'Üçer aylık geçici vergi hazırlık listesi',
    category: 'zorunlu',
    itemCount: 12,
    items: [
      { id: '1', text: 'Dönem mizan alındı mı?', checked: false },
      { id: '2', text: 'KKEG\'ler tespit edildi mi?', checked: false },
      { id: '3', text: 'İndirimler kontrol edildi mi?', checked: false },
      { id: '4', text: 'Zarar mahsubu hesaplandı mı?', checked: false },
      { id: '5', text: 'Matrah hesaplandı mı?', checked: false },
      { id: '6', text: 'Vergi oranı doğru uygulandı mı?', checked: false },
      { id: '7', text: 'Önceki dönem mahsubu yapıldı mı?', checked: false },
      { id: '8', text: 'Beyanname hazırlandı mı?', checked: false },
    ]
  },
  {
    id: 'kurumlar',
    name: 'Kurumlar Vergisi',
    description: 'Yıllık kurumlar vergisi beyanı kontrolleri',
    category: 'zorunlu',
    itemCount: 20,
    items: [
      { id: '1', text: 'Yıllık mizan kesinleşti mi?', checked: false },
      { id: '2', text: 'Ticari kar/zarar hesaplandı mı?', checked: false },
      { id: '3', text: 'KKEG\'ler eklendi mi?', checked: false },
      { id: '4', text: 'İstisnalar düşüldü mü?', checked: false },
      { id: '5', text: 'İndirimler uygulandı mı?', checked: false },
      { id: '6', text: 'Geçmiş yıl zararları mahsup edildi mi?', checked: false },
      { id: '7', text: 'Transfer fiyatlandırması formu hazır mı?', checked: false },
      { id: '8', text: 'Örtülü sermaye kontrolü yapıldı mı?', checked: false },
    ]
  },
  {
    id: 'kdv-iade',
    name: 'KDV İade Dosyası',
    description: 'KDV iade başvurusu evrak listesi',
    category: 'istege-bagli',
    itemCount: 18,
    items: [
      { id: '1', text: 'İade talep dilekçesi hazır mı?', checked: false },
      { id: '2', text: 'İndirilecek KDV listesi hazır mı?', checked: false },
      { id: '3', text: 'Yüklenilen KDV listesi hazır mı?', checked: false },
      { id: '4', text: 'Satış faturaları listesi hazır mı?', checked: false },
      { id: '5', text: 'Gümrük beyannameleri tamam mı?', checked: false },
      { id: '6', text: 'YMM raporu hazır mı?', checked: false },
    ]
  },
  {
    id: 'denetim',
    name: 'Denetim Hazırlık',
    description: 'Vergi incelemesi öncesi hazırlık listesi',
    category: 'istege-bagli',
    itemCount: 30,
    items: [
      { id: '1', text: 'Yasal defterler hazır mı?', checked: false },
      { id: '2', text: 'Yevmiye defteri bastırıldı mı?', checked: false },
      { id: '3', text: 'Kebir defteri bastırıldı mı?', checked: false },
      { id: '4', text: 'Envanter defteri hazır mı?', checked: false },
      { id: '5', text: 'Beyanname fotokopileri hazır mı?', checked: false },
      { id: '6', text: 'Banka hesap özetleri alındı mı?', checked: false },
    ]
  },
  {
    id: 'enflasyon',
    name: 'Enflasyon Düzeltmesi',
    description: 'Enflasyon muhasebesi belge listesi',
    category: 'zorunlu',
    itemCount: 15,
    items: [
      { id: '1', text: 'Parasal/parasal olmayan ayrımı yapıldı mı?', checked: false },
      { id: '2', text: 'Düzeltme katsayıları belirlendi mi?', checked: false },
      { id: '3', text: 'Reel olmayan finansman maliyeti hesaplandı mı?', checked: false },
      { id: '4', text: 'Stok düzeltmesi yapıldı mı?', checked: false },
      { id: '5', text: 'Maddi duran varlık düzeltmesi yapıldı mı?', checked: false },
      { id: '6', text: 'Sermaye düzeltmesi yapıldı mı?', checked: false },
    ]
  }
];

// Varsayılan scope değerleri (scope yoksa)
const DEFAULT_CLIENT_ID = 'default';
const DEFAULT_PERIOD_ID = '2026';

export default function KontrolListeleriPage() {
  const { showToast } = useToast();
  const [selectedListe, setSelectedListe] = useState<KontrolListesi | null>(null);
  const [checkStates, setCheckStates] = useState<Record<string, Record<string, boolean>>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Backend'den tüm checklist progress'leri yükle
  const loadAllProgress = useCallback(async () => {
    setIsLoadingProgress(true);
    try {
      const promises = KONTROL_LISTELERI.map(async (liste) => {
        try {
          const url = API_ENDPOINTS.checklists.progress(liste.id);
          const { data: json } = await api.get<{ success: boolean; data: Array<{ item_index: number; checked: number }> }>(
            url,
            { params: { client_id: DEFAULT_CLIENT_ID, period_id: DEFAULT_PERIOD_ID } }
          );
          if (json?.success && Array.isArray(json.data)) {
            const itemStates: Record<string, boolean> = {};
            for (const item of json.data) {
              const itemId = String(item.item_index + 1);
              itemStates[itemId] = item.checked === 1;
            }
            return { listeId: liste.id, items: itemStates };
          }
          return { listeId: liste.id, items: {} };
        } catch {
          return { listeId: liste.id, items: {} };
        }
      });

      const results = await Promise.all(promises);
      const newStates: Record<string, Record<string, boolean>> = {};
      for (const r of results) {
        if (Object.keys(r.items).length > 0) {
          newStates[r.listeId] = r.items;
        }
      }
      setCheckStates(newStates);
    } catch {
      // fail-soft: keep empty states
    } finally {
      setIsLoadingProgress(false);
    }
  }, []);

  useEffect(() => {
    loadAllProgress();
  }, [loadAllProgress]);

  const handleToggleItem = async (listeId: string, itemId: string) => {
    const currentChecked = checkStates[listeId]?.[itemId] || false;
    const newChecked = !currentChecked;

    // Optimistic update
    setCheckStates(prev => ({
      ...prev,
      [listeId]: {
        ...(prev[listeId] || {}),
        [itemId]: newChecked
      }
    }));

    // Backend'e kaydet
    setSyncStatus('saving');
    try {
      const { error: apiError } = await api.put(API_ENDPOINTS.checklists.toggle(listeId), {
        client_id: DEFAULT_CLIENT_ID,
        period_id: DEFAULT_PERIOD_ID,
        item_index: parseInt(itemId) - 1,
        checked: newChecked
      });

      if (!apiError) {
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
        setCheckStates(prev => ({
          ...prev,
          [listeId]: {
            ...(prev[listeId] || {}),
            [itemId]: currentChecked
          }
        }));
      }
    } catch {
      setSyncStatus('error');
      setCheckStates(prev => ({
        ...prev,
        [listeId]: {
          ...(prev[listeId] || {}),
          [itemId]: currentChecked
        }
      }));
    }
  };

  const getCheckedCount = (listeId: string, items: KontrolMaddesi[]) => {
    const listeState = checkStates[listeId] || {};
    return items.filter(item => listeState[item.id]).length;
  };

  const handleExportExcel = () => {
    showToast('info', 'Excel export özelliği yakında eklenecek');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Kontrol Listeleri</h1>
          <p className="text-[#969696]">Dönemsel işlemler için hazır kontrol listeleri</p>
        </div>
        <div className="flex items-center gap-4">
          {syncStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-[#969696]">
              <Loader2 className="w-3 h-3 animate-spin" /> Kaydediliyor...
            </span>
          )}
          {syncStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-[#00804D]">
              <Cloud className="w-3 h-3" /> Kaydedildi
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-[#BF192B]">
              <CloudOff className="w-3 h-3" /> Kayıt hatası
            </span>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-[#0049AA] hover:text-[#0049AA]"
          >
            <Download className="w-4 h-4" />
            Tümünü İndir
          </button>
        </div>
      </div>

      {isLoadingProgress ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KONTROL_LISTELERI.map(liste => {
            const checkedCount = getCheckedCount(liste.id, liste.items);
            const progress = (checkedCount / liste.items.length) * 100;

            return (
              <button
                key={liste.id}
                onClick={() => setSelectedListe(liste)}
                className="bg-white border border-[#E5E5E5] rounded-lg p-4 text-left hover:shadow-md hover:border-[#5ED6FF] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E6F9FF] rounded-lg flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-[#0049AA]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#2E2E2E]">{liste.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          liste.category === 'zorunlu'
                            ? 'bg-[#FEF2F2] text-[#BF192B]'
                            : 'bg-[#F5F6F8] text-[#5A5A5A]'
                        }`}>
                          {liste.category === 'zorunlu' ? 'Zorunlu' : 'İsteğe Bağlı'}
                        </span>
                      </div>
                      <p className="text-sm text-[#969696]">{liste.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#969696]" />
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#969696] mb-1">
                    <span>{checkedCount} / {liste.items.length} madde</span>
                    <span>%{Math.round(progress)}</span>
                  </div>
                  <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress === 100 ? 'bg-[#00A651]' : 'bg-[#0049AA]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detay Modal */}
      {selectedListe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-[#2E2E2E]">{selectedListe.name}</h2>
                <p className="text-sm text-[#969696]">{selectedListe.description}</p>
              </div>
              <button
                onClick={() => setSelectedListe(null)}
                className="text-[#969696] hover:text-[#5A5A5A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {selectedListe.items.map((item, index) => {
                  const isChecked = checkStates[selectedListe.id]?.[item.id] || false;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggleItem(selectedListe.id, item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        isChecked
                          ? 'bg-[#ECFDF5] border-[#AAE8B8]'
                          : 'bg-white border-[#E5E5E5] hover:border-[#5ED6FF]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isChecked
                          ? 'bg-[#00A651] border-[#00A651]'
                          : 'border-[#B4B4B4]'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`flex-1 ${isChecked ? 'text-[#969696] line-through' : 'text-[#5A5A5A]'}`}>
                        {index + 1}. {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-[#F5F6F8] rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#969696]">
                    {getCheckedCount(selectedListe.id, selectedListe.items)} / {selectedListe.items.length} tamamlandı
                  </span>
                  {syncStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-xs text-[#969696]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </span>
                  )}
                  {syncStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-xs text-[#00804D]">
                      <Cloud className="w-3 h-3" /> Kaydedildi
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedListe(null)}
                  className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#003D8F]"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
