'use client';

import { useState } from 'react';
import { CheckSquare, ChevronRight, X, Download, Check } from 'lucide-react';

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

export default function KontrolListeleriPage() {
  const [selectedListe, setSelectedListe] = useState<KontrolListesi | null>(null);
  const [checkStates, setCheckStates] = useState<Record<string, Record<string, boolean>>>({});

  const handleToggleItem = (listeId: string, itemId: string) => {
    setCheckStates(prev => ({
      ...prev,
      [listeId]: {
        ...(prev[listeId] || {}),
        [itemId]: !(prev[listeId]?.[itemId] || false)
      }
    }));
  };

  const getCheckedCount = (listeId: string, items: KontrolMaddesi[]) => {
    const listeState = checkStates[listeId] || {};
    return items.filter(item => listeState[item.id]).length;
  };

  const handleExportExcel = () => {
    alert('Excel export özelliği yakında eklenecek');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontrol Listeleri</h1>
          <p className="text-gray-500">Dönemsel işlemler için hazır kontrol listeleri</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Download className="w-4 h-4" />
          Tümünü İndir
        </button>
      </div>

      {/* Kart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KONTROL_LISTELERI.map(liste => {
          const checkedCount = getCheckedCount(liste.id, liste.items);
          const progress = (checkedCount / liste.items.length) * 100;

          return (
            <button
              key={liste.id}
              onClick={() => setSelectedListe(liste)}
              className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{liste.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        liste.category === 'zorunlu'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {liste.category === 'zorunlu' ? 'Zorunlu' : 'İsteğe Bağlı'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{liste.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{checkedCount} / {liste.items.length} madde</span>
                  <span>%{Math.round(progress)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detay Modal */}
      {selectedListe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedListe.name}</h2>
                <p className="text-sm text-gray-500">{selectedListe.description}</p>
              </div>
              <button
                onClick={() => setSelectedListe(null)}
                className="text-gray-400 hover:text-gray-600"
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
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isChecked
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`flex-1 ${isChecked ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                        {index + 1}. {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {getCheckedCount(selectedListe.id, selectedListe.items)} / {selectedListe.items.length} tamamlandı
                </span>
                <button
                  onClick={() => setSelectedListe(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
