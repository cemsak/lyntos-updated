from typing import Dict, Any, List
from services.llm_guard import generate_with_fallback

GENERALGE_BASLIK = "SMİYB Genelgesi (E-55935724-010.06-7361, 18.04.2025)"

def vdk_uzmani_yorumu(input_summary:Dict[str,Any], shb:Dict[str,Any]) -> str:
    """
    input_summary: firma/donem ve temel finansal kısa özet
    shb: analyze_shb çıktısı
    """
    prompt = f"""
Sen bir Vergi Müfettişi/VDK uzmanısın. {GENERALGE_BASLIK} hükümlerine göre SADECE verilen kanıtlara dayanarak kanaat oluştur.

- Mükellef özeti: {input_summary}
- SMİYB analiz özeti: skor={shb.get('skor')}, durum={shb.get('durum')}, eksik_veriler={shb.get('eksik_veriler')}
- Neden/Etki/Kanıtlardan bazıları: {shb.get('nedenler')}

Yazım kuralları:
- Veri yoksa “(veri yok)” yaz.
- Kanaat açık ve kısa paragraflar + madde işaretleri ile olsun.
- “Bilerek kullanma” konusunda kanaat verirken sadece kanıtları değerlendir; asla varsayım yapma.
- Son bölümde “İzlenecek Adımlar (Öneri)” başlığı ile operasyonel 3-5 öneri ver.
"""
    messages = [{"role":"system","content":"Türkçe yaz. Abartısız, kanıta dayalı, kısa."},
                {"role":"user","content": prompt}]
    return generate_with_fallback(messages)

def ai_genel_analiz(input_summary:Dict[str,Any], radar:Dict[str,Any], shb:Dict[str,Any]) -> str:
    prompt = f"""
Aşağıdaki RADAR ve SMİYB bulgularına dayanarak genel risk analizini özetle.
- Özet: {input_summary}
- RADAR: {radar}
- SMİYB: {shb}

Kurallar:
- Kanıtı olmayan yargı yazma; “(veri yok)” yaz.
- 5 maddeyi geçmeyen “Öncelikli Aksiyonlar” listesi ver.
- Son satırda “Genel Kanaat: Düşük/Orta/Yüksek” yaz (RADAR ve SMİYB durumlarını birlikte tart).
"""
    messages = [{"role":"system","content":"Türkçe yaz. Net, denetime uygun, kısa."},
                {"role":"user","content": prompt}]
    return generate_with_fallback(messages)
