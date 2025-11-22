from typing import Dict, Any, List

def radar_rule_eval(fin: Dict[str,Any]) -> Dict[str,Any]:
    """
    fin beklenen olası alanlar:
      - kasa_nakit_anormal (bool/None)
      - ortaklara_borclanma_katsayi (float/None)  # sermayenin katı
      - kredi_varken_yuksek_nakit (bool/None)
      - babs_uyumsuzluk (bool/None)
      - stok_yuksek (bool/None)
      - stok_deger_dusuklugu (bool/None)
      - karlilik_sektor_sapma (bool/None)
      - pos_hasılat_uyumsuz (bool/None)
      - faaliyet_gider_sapma (bool/None)
      - degerleme_hatalari (bool/None)
      - amortisman_hatalari (bool/None)
    """
    items: List[Dict[str,str]] = []
    score = 0

    def add(flag, pts, title, suggest):
        nonlocal score, items
        if flag is True:
            score += pts
            items.append({"baslik": title, "etki": "Artırıcı", "onerı": suggest})
        elif flag is False:
            items.append({"baslik": title, "etki": "Azaltıcı", "onerı": "Mevcut uygulama sürdür."})
        # None ise hiç puan ekleme, veri yok

    add(fin.get("kasa_nakit_anormal"), 6, "Kasa hesabı anormal yüksek", "Kasa-fiili sayım ve nakit politikası.")
    ok = fin.get("ortaklara_borclanma_katsayi")
    if ok is not None and ok > 3:
        score += 6
        items.append({"baslik":"Ortaklara aşırı borç", "etki":"Artırıcı", "onerı":"İlişkili işlemler faiz/emsal kontrolü."})

    add(fin.get("kredi_varken_yuksek_nakit"), 5, "Kredi varken yüksek nakit", "Finansman optimizasyonu/amaç incelemesi.")
    add(fin.get("babs_uyumsuzluk"), 7, "BA/BS ve KDV uyumsuzluğu", "Karşıt tespit ve mutabakat.")
    add(fin.get("stok_yuksek"), 5, "Yüksek stok", "Stok devir hızı ve değerleme kontrolü.")
    add(fin.get("stok_deger_dusuklugu"), 4, "Stok değer düşüklüğü", "Takdir komisyonu/kanıt belgeleri.")
    add(fin.get("karlilik_sektor_sapma"), 6, "Karlılık sektör sapması", "Emsal karşılaştırma/ayrıntılı analiz.")
    add(fin.get("pos_hasılat_uyumsuz"), 5, "POS-hasılat uyumsuzluğu", "POS kayıtlarının hasılatla eşleştirilmesi.")
    add(fin.get("faaliyet_gider_sapma"), 4, "Faaliyet gider sapması", "Bütçe/gerçekleşen analizi.")
    add(fin.get("degerleme_hatalari"), 7, "Değerleme hataları", "VUK değerleme düzeltmeleri.")
    add(fin.get("amortisman_hatalari"), 5, "Amortisman uygulama hataları", "Yöntem/Oran kontrolü.")

    # Normalize: 0-100
    score = max(0, min(100, score))
    durum = "Düşük" if score < 30 else ("Orta" if score < 60 else "Yüksek")
    return {"radar_risk_skoru": score, "radar_risk_durumu": durum, "nedenler": items}
