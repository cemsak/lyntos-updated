"""
VERGUS Corporate Chat Agent
Sprint S3 - Sirketler Hukuku AI Asistani
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging
import uuid

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    Anthropic = None

from database.db import get_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CorporateChatAgent:
    """Sirketler Hukuku AI Chat Asistani"""

    SYSTEM_PROMPT = """Sen VERGUS sisteminin Sirketler Hukuku uzmanisin.
Turk Ticaret Kanunu (TTK) ve sirketler hukuku konularinda SMMM'lere yardimci oluyorsun.

## Uzmanlik Alanlarin:
1. **Sirket Islemleri**: Kurulus, birlesme, bolunme, tur degisikligi, tasfiye
2. **Sermaye Islemleri**: Sermaye artirimi, azaltimi, TTK 376 analizi
3. **Genel Kurul**: Toplanti ve karar nisaplari, prosedurler
4. **Belge Gereksinimleri**: Her islem icin gerekli evraklar
5. **Vergi Etkileri**: KV, KDV istisnalari, damga vergisi

## Onemli Kurallar:
- Her zaman yasal dayanagi belirt (TTK madde no, teblig, vb.)
- Sureleri ve deadline'lari vurgula
- Vergisel avantajlari ve riskleri acikla
- Pratik oneriler ver
- Emin olmadigin konularda "bir uzmana danismanizi oneririm" de

## Yanit Formati:
- Kisa ve oz cevaplar ver
- Madde madde listele (gerektiginde)
- Onemli uyarilari UYARI: ile isaretle
- Deadline'lari SURE: ile isaretle
- Belgeleri BELGE: ile isaretle

## Mevcut Bilgi Tabani:
{context}

Kullanicinin sorusuna gore yukaridaki bilgi tabanindan faydalanarak yanit ver.
Bilgi tabaninda olmayan konularda genel TTK bilgini kullan."""

    QUICK_RESPONSES = {
        "merhaba": "Merhaba! Ben VERGUS Sirketler Hukuku asistaniyim. TTK, sirket islemleri, sermaye, birlesme, bolunme, tasfiye gibi konularda size yardimci olabilirim. Nasil yardimci olabilirim?",
        "selam": "Selam! Sirketler hukuku konusunda size nasil yardimci olabilirim?",
        "tesekkurler": "Rica ederim! Baska bir sorunuz olursa yardimci olmaktan memnuniyet duyarim.",
        "tesekkur": "Rica ederim! Baska sorunuz var mi?",
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.model = "claude-sonnet-4-20250514"

        if ANTHROPIC_AVAILABLE and self.api_key:
            try:
                self.client = Anthropic(api_key=self.api_key)
                logger.info("Corporate Chat Agent initialized with Claude API")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
        else:
            logger.warning("Running in demo mode - Claude API not available")

        # Load corporate context
        self.corporate_context = self._load_corporate_context()

    def _load_corporate_context(self) -> str:
        """S1 veritabanindan sirket islemleri bilgisini yukle"""
        context_parts = []

        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM corporate_event_types WHERE is_active = 1")
                events = cursor.fetchall()

                context_parts.append("## Sirket Islem Tipleri:\n")

                for event in events:
                    event_dict = dict(event)
                    company_types = json.loads(event_dict.get('company_types') or '[]')
                    required_docs = json.loads(event_dict.get('required_documents') or '[]')
                    gk_quorum = event_dict.get('gk_quorum') or '-'
                    tax_implications = event_dict.get('tax_implications') or '{}'

                    context_parts.append(f"""
### {event_dict['event_name']} ({event_dict['event_code']})
- **Sirket Tipleri**: {', '.join(company_types) if company_types else 'Tumu'}
- **Yasal Dayanak**: {event_dict.get('legal_basis') or '-'}
- **Tescil Suresi**: {event_dict.get('registration_deadline') or '-'} gun
- **Gerekli Belgeler**: {', '.join(required_docs) if required_docs else '-'}
- **GK Nisabi**: {gk_quorum}
- **Vergi Etkileri**: {tax_implications}
- **Notlar**: {event_dict.get('notes') or '-'}
""")

        except Exception as e:
            logger.error(f"Failed to load corporate context: {e}")
            context_parts.append("Sirket islemleri veritabani yuklenemedi.")

        context_parts.append("""
## Onemli Esikler ve Sureler:
- Asgari Sermaye A.S.: 250.000 TL (Kayitli sermaye: 500.000 TL)
- Asgari Sermaye Ltd.: 50.000 TL
- Mevcut sirketler icin tamamlama suresi: 31.12.2026 (7511 sayili Kanun)
- Tescil sureleri genellikle 15-30 gun
- TTK 376/1: Sermayenin yarisi kaybedilmisse GK toplanir
- TTK 376/2: Sermayenin 2/3'u kaybedilmisse sermaye artirimi veya tasfiye
- TTK 376/3: Borca batiklik durumunda mahkemeye bildirim (IIK 179)
""")

        return "\n".join(context_parts)

    def create_session(self, user_id: str = "default", context: Optional[Dict] = None) -> str:
        """Yeni chat session olustur"""
        session_id = str(uuid.uuid4())

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (id, user_id, agent_type, context, is_active, message_count, created_at)
                VALUES (?, ?, 'corporate', ?, 1, 0, datetime('now'))
            """, (session_id, user_id, json.dumps(context or {})))
            conn.commit()

        logger.info(f"Created chat session: {session_id}")
        return session_id

    def get_session_history(self, session_id: str, limit: int = 20) -> List[Dict]:
        """Session mesaj gecmisini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, content, created_at FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (session_id, limit))
            messages = cursor.fetchall()

            return [
                {"role": m['role'], "content": m['content'], "created_at": m['created_at']}
                for m in reversed(messages)
            ]

    def chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        user_id: str = "default"
    ) -> Dict:
        """Chat mesaji gonder ve yanit al"""
        start_time = time.time()

        # Session yoksa olustur
        if not session_id:
            session_id = self.create_session(user_id)

        # Quick response kontrolu
        message_lower = message.lower().strip()
        for trigger, response in self.QUICK_RESPONSES.items():
            if trigger in message_lower and len(message_lower) < 30:
                return self._save_and_return(
                    session_id, message, response,
                    0, int((time.time() - start_time) * 1000),
                    is_quick=True
                )

        # Mesaj gecmisini al
        history = self.get_session_history(session_id, limit=10)

        # Claude API ile yanit al
        if self.client:
            try:
                response = self._call_claude(message, history)
            except Exception as e:
                logger.error(f"Claude API error: {e}")
                response = self._demo_response(message)
        else:
            response = self._demo_response(message)

        processing_time = int((time.time() - start_time) * 1000)
        tokens_used = response.get("tokens_used", 0)
        content = response.get("content", "Yanit olusturulamadi.")

        return self._save_and_return(
            session_id, message, content,
            tokens_used, processing_time
        )

    def _call_claude(self, message: str, history: List[Dict]) -> Dict:
        """Claude API cagrisi"""
        system = self.SYSTEM_PROMPT.format(context=self.corporate_context)

        messages = []
        for h in history[-8:]:
            messages.append({
                "role": h["role"],
                "content": h["content"]
            })
        messages.append({"role": "user", "content": message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            system=system,
            messages=messages
        )

        return {
            "content": response.content[0].text,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "model": self.model
        }

    def _demo_response(self, message: str) -> Dict:
        """Demo mod icin ornek yanitlar"""
        message_lower = message.lower()

        if "kurulus" in message_lower or "kurma" in message_lower:
            if "anonim" in message_lower or "a.s" in message_lower or "a.ş" in message_lower:
                return {"content": self._get_demo_as_kurulus(), "tokens_used": 0}
            elif "limited" in message_lower or "ltd" in message_lower:
                return {"content": self._get_demo_ltd_kurulus(), "tokens_used": 0}
            else:
                return {"content": """Hangi tur sirket kurmak istiyorsunuz?

**Anonim Sirket (A.S.)** icin:
- Asgari sermaye: 250.000 TL
- En az 1 kurucu
- Yonetim Kurulu zorunlu

**Limited Sirket (Ltd.)** icin:
- Asgari sermaye: 50.000 TL
- En az 1, en fazla 50 ortak
- Mudur atamasi zorunlu

Detayli bilgi icin sirket turunu belirtir misiniz?""", "tokens_used": 0}

        elif "sermaye artirim" in message_lower:
            return {"content": self._get_demo_sermaye_artirim(), "tokens_used": 0}

        elif "376" in message_lower or "sermaye kayb" in message_lower:
            return {"content": self._get_demo_ttk376(), "tokens_used": 0}

        elif "birlesme" in message_lower or "merger" in message_lower:
            return {"content": self._get_demo_birlesme(), "tokens_used": 0}

        elif "tasfiye" in message_lower:
            return {"content": self._get_demo_tasfiye(), "tokens_used": 0}

        elif "belge" in message_lower or "evrak" in message_lower:
            return {"content": """Hangi islem icin belge listesi istiyorsunuz?

Ornek sorular:
- "A.S. kurulusu icin belgeler"
- "Sermaye artirimi evraklari"
- "Birlesme icin gerekli belgeler"
- "Tasfiye basvuru evraklari"

Islem turunu belirtirseniz detayli liste verebilirim.""", "tokens_used": 0}

        elif "nisap" in message_lower or "toplanti" in message_lower or "karar" in message_lower:
            return {"content": self._get_demo_nisap(), "tokens_used": 0}

        else:
            return {"content": """Sirketler hukuku konusunda size yardimci olabilirim. Ornek sorular:

**Islem Bilgileri**
- "A.S. nasil kurulur?"
- "Sermaye artirimi nasil yapilir?"
- "Birlesme icin ne gerekli?"

**Belge Listeleri**
- "Ltd. kurulus belgeleri neler?"
- "Tasfiye icin hangi evraklar lazim?"

**Hesaplamalar**
- "TTK 376 analizi yap"
- "GK nisabi nedir?"

**Yasal Bilgiler**
- "Asgari sermaye ne kadar?"
- "Tescil suresi ne kadar?"

Sorunuzu daha detayli sorarsaniz yardimci olabilirim.""", "tokens_used": 0}

    def _get_demo_as_kurulus(self) -> str:
        return """## Anonim Sirket (A.S.) Kurulusu

### Temel Bilgiler
- **Asgari Sermaye**: 250.000 TL
- **Kayitli Sermaye Sistemi**: Min. 500.000 TL
- **Kurucu Sayisi**: En az 1 gercek/tuzel kisi
- **Yasal Dayanak**: TTK 329-340

### BELGE: Gerekli Belgeler
1. MERSIS basvurusu
2. Dilekce (yetkili imzali)
3. Kurulus bildirim formu
4. Noter onayli esas sozlesme (4 nusha)
5. Kurucularin imza beyannamesi
6. Kurucu beyani
7. Oda kayit beyannamesi
8. Sermaye blokaj yazisi (%25)
9. Rekabet Kurumu payi dekontu

### SURE: Sureler
- Tescil suresi: 15 gun
- Sermaye tamamlama: 24 ay icinde

### Maliyetler
- Noter masraflari
- Ticaret Sicil harci
- Rekabet Kurumu payi (sermayenin %0.04'u)

UYARI: Sirket tescilden once tuzel kisilik kazanamaz!"""

    def _get_demo_ltd_kurulus(self) -> str:
        return """## Limited Sirket (Ltd.) Kurulusu

### Temel Bilgiler
- **Asgari Sermaye**: 50.000 TL
- **Ortak Sayisi**: 1-50 arasi
- **Yasal Dayanak**: TTK 573-644

### BELGE: Gerekli Belgeler
1. MERSIS basvurusu
2. Dilekce (yetkili imzali)
3. Kurulus bildirim formu
4. Noter onayli sirket sozlesmesi (4 nusha)
5. Kurucularin imza beyannamesi
6. Kurucu beyani
7. Oda kayit beyannamesi
8. Sermaye blokaj yazisi (%25)
9. Mudur atamasi (sozlesmede veya ayri karar)

### SURE: Sureler
- Tescil suresi: 15 gun
- Sermaye tamamlama: 24 ay icinde

### Avantajlar
- Daha dusuk asgari sermaye
- Daha az formalite
- Esnek yonetim yapisi

UYARI: Ltd.'de ortaklar sirket borclarindan sinirli sorumludur (sermaye taahhudi kadar)."""

    def _get_demo_sermaye_artirim(self) -> str:
        return """## Sermaye Artirimi

### Yontemler
1. **Ic Kaynaklardan** (Yedekler, fonlar)
2. **Dis Kaynaklardan** (Yeni pay ihraci)
3. **Sartli Artirim** (Ruchan hakki kullanimi)

### BELGE: Gerekli Belgeler
1. Noter onayli GK karari
2. Tadil metni (esas sozlesme degisikligi)
3. Artirilan sermayenin odendigine dair belge
4. YMM/SMMM raporu (ic kaynak ise)
5. Bilirkisi raporu (ayni sermaye ise)

### GK Nisabi
| Sirket Tipi | Toplanti | Karar |
|-------------|----------|-------|
| A.S. | 1/4 | Cogunluk |
| Ltd. | - | Oy coklugu |

### SURE: Sureler
- GK karavindan sonra 3 ay icinde tescil
- Aksi halde karar gecersiz olur

### Vergisel Durum
- Damga vergisi: Binde 9,48
- Rekabet Kurumu payi: Artirilan sermayenin %0,04'u

UYARI: Ic kaynaklardan artirimda kaynaklarin varligi YMM/SMMM raporu ile belgelenmeli!"""

    def _get_demo_ttk376(self) -> str:
        return """## TTK 376 - Sermaye Kaybi ve Borca Batiklik

### Esikler

| Durum | Kosul | Yukumluluk |
|-------|-------|------------|
| **376/1** | Sermaye + yedeklerin yarisi kayip | GK toplantisi, onlem tartisma |
| **376/2** | Sermayenin 2/3'u kayip | Sermaye artirimi VEYA tasfiye |
| **376/3** | Borca batiklik (pasif > aktif) | Mahkemeye bildirim (IIK 179) |

### Hesaplama
```
Sermaye Kaybi = Sermaye + Yedekler - Oz Varlik
Kayip Orani = Sermaye Kaybi / (Sermaye + Yedekler) x 100
```

### SURE: Kritik Sureler
- 376/1: Derhal GK toplantisi
- 376/2: Derhal karar (artirim veya tasfiye)
- 376/3: 30 gun icinde mahkemeye basvuru

### Yonetim Kurulu Sorumlulugu
- Zamaninda onlem almayan YK uyeleri sahsen sorumlu
- Cezai sorumluluk da dogabilir

TTK 376 analizi icin su bilgileri verin:
- Sermaye tutari
- Kanuni yedek akce
- Oz varlik (son bilanco)"""

    def _get_demo_birlesme(self) -> str:
        return """## Sirket Birlesmesi

### Birlesme Turleri
1. **Devralma Seklinde**: Bir sirket digerini devralir
2. **Yeni Kurulus Seklinde**: Yeni sirket kurulur

### BELGE: Gerekli Belgeler
1. Birlesme sozlesmesi (noter onayli)
2. Birlesme raporu
3. Son 3 yil finansal tablolar
4. Ara bilanco (6 aydan eski degil)
5. GK kararlari (her iki sirket)
6. Alacaklilara cagri ilani

### GK Nisabi
| Sirket | Toplanti | Karar |
|--------|----------|-------|
| A.S. | 1/2 | 2/3 |
| Ltd. | - | 3/4 |

### SURE: Surec
1. Birlesme sozlesmesi hazirla
2. Birlesme raporu hazirla
3. Belgeleri incelemeye sun (30 gun)
4. GK onayi
5. Tescil (15 gun icinde)

### Vergisel Durum
- **KV Istisnasi**: KVK 19-20 sartlari ile
- **KDV Istisnasi**: KDVK 17/4-c
- **Damga/Harc**: Istisna

UYARI: Kolaylastirilmis birlesme icin %90+ pay orani gerekli."""

    def _get_demo_tasfiye(self) -> str:
        return """## Sirket Tasfiyesi

### Tasfiye Nedenleri
- Sure dolmasi
- GK karari
- Iflas
- Mahkeme karari
- Diger (kanuni nedenler)

### BELGE: Gerekli Belgeler
1. Tasfiye GK karari (noter onayli)
2. Tasfiye memuru atama karari
3. Tasfiye acilis bilancosu
4. Alacaklilara cagri ilan metni
5. Ticaret Sicil basvuru dilekcesi

### SURE: Surec ve Sureler
1. **Tasfiye Karari**: GK toplanir
2. **Tescil**: 15 gun icinde
3. **Alacaklilara Cagri**: 3 kez, 7'ser gun arayla TTSG'de
4. **Bekleme Suresi**: Son ilandan 1 yil (bazi durumlarda 6 ay)
5. **Tasfiye Sonu**: Varliklar dagitilir, terkin yapilir

### Vergisel Yukumlulukler
- Tasfiye donemi icin ayri KV beyani
- KDV mukellefiyeti tasfiye sonuna kadar devam
- SGK bildirimleri devam eder

### GK Nisabi
| Sirket | Toplanti | Karar |
|--------|----------|-------|
| A.S. | 1/4 | Cogunluk |
| Ltd. | - | Cogunluk |

UYARI: Tasfiye suresince sirket unvanina "Tasfiye Halinde" ibaresi eklenir!"""

    def _get_demo_nisap(self) -> str:
        return """## Genel Kurul Nisaplari

### A.S. Toplanti ve Karar Nisaplari

| Islem | Toplanti Nisabi | Karar Nisabi |
|-------|-----------------|--------------|
| Olagan GK | 1/4 | Cogunluk |
| Esas sozlesme degisikligi | 1/2 | Cogunluk |
| Sermaye artirimi | 1/4 | Cogunluk |
| Sermaye azaltimi | 1/2 | Cogunluk |
| Birlesme | 1/2 | 2/3 |
| Bolunme | 1/2 | 2/3 |
| Tur degisikligi | 1/2 | 2/3 |
| Tasfiye | 1/4 | Cogunluk |
| Imtiyazli pay | 3/4 | 3/4 |

### Ltd. Karar Nisaplari

| Islem | Karar Nisabi |
|-------|--------------|
| Olagan kararlar | Oy coklugu |
| Sozlesme degisikligi | 2/3 |
| Sermaye artirimi | Oy coklugu |
| Birlesme/Bolunme | 3/4 |
| Tur degisikligi | 3/4 |
| Tasfiye | Cogunluk |

### Onemli Notlar
- Ilk toplantida nisap saglanmazsa, ikinci toplantida aranan nisap duser
- Bazi kararlar icin oy birligi gerekebilir (ortaklik haklari)
- Imtiyazli pay sahipleri ozel kurul toplayabilir

UYARI: Nisaplar esas sozlesme ile agirlastirabilir, hafiflietilemez!"""

    def _save_and_return(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        tokens_used: int,
        processing_time_ms: int,
        is_quick: bool = False
    ) -> Dict:
        """Mesajlari kaydet ve yanit dondur"""
        msg_id = str(uuid.uuid4())

        with get_connection() as conn:
            cursor = conn.cursor()

            # User message
            cursor.execute("""
                INSERT INTO chat_messages (id, session_id, role, content, created_at)
                VALUES (?, ?, 'user', ?, datetime('now'))
            """, (str(uuid.uuid4()), session_id, user_message))

            # Assistant response
            cursor.execute("""
                INSERT INTO chat_messages (id, session_id, role, content, tokens_used, processing_time_ms, metadata, created_at)
                VALUES (?, ?, 'assistant', ?, ?, ?, ?, datetime('now'))
            """, (msg_id, session_id, assistant_response, tokens_used, processing_time_ms, json.dumps({"is_quick": is_quick})))

            # Update session
            cursor.execute("""
                UPDATE chat_sessions
                SET message_count = message_count + 2,
                    last_message_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
            """, (session_id,))

            conn.commit()

        return {
            "session_id": session_id,
            "message_id": msg_id,
            "content": assistant_response,
            "tokens_used": tokens_used,
            "processing_time_ms": processing_time_ms,
            "model": self.model if self.client else "demo"
        }

    def analyze_ttk376(self, capital: float, legal_reserves: float, equity: float) -> Dict:
        """TTK 376 analizi yap"""
        total_protected = capital + legal_reserves
        loss = total_protected - equity
        loss_percentage = (loss / total_protected) * 100 if total_protected > 0 else 0

        half_threshold = total_protected / 2
        twothirds_threshold = total_protected / 3

        if equity <= 0:
            status = "insolvent"
            recommendation = f"""UYARI: BORCA BATIKLIK DURUMU (TTK 376/3)

Oz varlik negatif veya sifir. Acil islemler:
1. 30 gun icinde mahkemeye basvuru (IIK 179)
2. Iflas erteleme veya konkordato degerlendirmesi
3. Yonetim kurulunun sahsi sorumlulugu baslar

Derhal bir avukat ile gorusmenizi oneririm."""
        elif equity <= twothirds_threshold:
            status = "twothirds_loss"
            recommendation = f"""UYARI: 2/3 SERMAYE KAYBI (TTK 376/2)

Oz varlik ({equity:,.0f} TL), korunan sermayenin 1/3'unun ({twothirds_threshold:,.0f} TL) altinda.

Yapilmasi gerekenler:
1. Derhal GK toplantisi
2. Iki secenek: Sermaye artirimi VEYA Tasfiye karari
3. Karar alinmazsa yonetim kurulu sorumlu olur

SURE: Acil aksiyon gerekli!"""
        elif equity <= half_threshold:
            status = "half_loss"
            recommendation = f"""UYARI: YARI SERMAYE KAYBI (TTK 376/1)

Oz varlik ({equity:,.0f} TL), korunan sermayenin yarisinin ({half_threshold:,.0f} TL) altinda.

Yapilmasi gerekenler:
1. GK toplantisi duzenle
2. Durumu ortaklara bildir
3. Iyilestirme onlemlerini tartis

Oneri: Sermaye artirimi veya gider azaltma plani yapin."""
        else:
            status = "healthy"
            recommendation = f"""SAGLIKLI DURUM

Oz varlik ({equity:,.0f} TL), guvenli seviyede.

Guvenlik marji:
- 1/2 esigine uzaklik: {equity - half_threshold:,.0f} TL
- 1/3 esigine uzaklik: {equity - twothirds_threshold:,.0f} TL

Oneri: Duzenli olarak TTK 376 takibi yapmanizi oneririm."""

        return {
            "status": status,
            "loss_percentage": round(loss_percentage, 2),
            "half_threshold": half_threshold,
            "twothirds_threshold": twothirds_threshold,
            "recommendation": recommendation,
            "legal_basis": "TTK 376"
        }


# Singleton instance
corporate_chat_agent = CorporateChatAgent()
