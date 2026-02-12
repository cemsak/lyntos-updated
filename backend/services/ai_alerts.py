import os
from dotenv import load_dotenv
from openai import OpenAI
from services.pii_guard import mask_company_name

# --- Ortam değişkenlerini yükle (.env) ---
load_dotenv()

# --- OpenAI istemcisi (lazy init — modül import'unda hata vermesin) ---
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_PROJECT_KEY"),
            timeout=30.0,
        )
    return _client


def generate_ai_alerts(data: dict) -> dict:
    """
    AI Risk Uyarıları (sağ panel):
    - KURGAN + RADAR analiz sonuçlarından uyarı metinleri üretir
    - OpenAI mini modelini kullanarak özetler
    """

    try:
        # Temel verileri topla
        kurgan = data.get("kurgan", {})
        radar = data.get("radar", {})

        # Firma bilgilerini maskele (KVKK)
        masked_summary = mask_company_name(data.get('summary')) if data.get('summary') else 'Bilinmiyor'
        summary_text = f"""
        Firma Özeti: {masked_summary}
        KURGAN Skoru: {kurgan.get('risk_skoru', '—')}
        RADAR Skoru: {radar.get('radar_risk_skoru', '—')}
        Vergi Uyum Endeksi: {kurgan.get('vergi_uyum_endeksi', '—')}
        Son Risk Durumu: {kurgan.get('risk_durumu', '—')}
        """

        # OpenAI modeli çağrısı
        client = _get_client()
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL_DEFAULT", "gpt-4.1-mini"),
            messages=[
                {
                    "role": "system",
                    "content": "Sen bir mali müşavir asistanısın. Görevin KURGAN ve RADAR analizlerinden çıkan verilerden kısa, anlamlı AI risk uyarıları üretmektir."
                },
                {
                    "role": "user",
                    "content": f"""
                    {summary_text}
                    Buna göre 3-5 adet kısa uyarı üret. Format şu şekilde olsun:
                    - Uyarı Başlığı: ...
                    - Açıklama: ...
                    - Öneri: ...
                    """
                }
            ],
            temperature=0.0,
            max_tokens=300
        )

        ai_text = completion.choices[0].message.content.strip()

        # Basit satır ayrıştırma (metin → liste)
        uyarilar = []
        for satir in ai_text.split("\n"):
            if satir.strip().startswith("- Uyarı"):
                uyarilar.append(satir.strip())

        return {"uyarilar": uyarilar, "raw": ai_text}

    except Exception as e:
        print(f"[AI_ALERTS] OpenAI hata: {e}")
        return {"uyarilar": [f"Hata: {e}"]}
