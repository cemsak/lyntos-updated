"""
VERGUS RegWatch Chat Agent
Sprint R4 - Mevzuat Takibi AI Asistani
"""
import os
import time
from datetime import datetime, date
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


class RegWatchChatAgent:
    """Mevzuat Takibi AI Chat Asistani"""

    SYSTEM_PROMPT = """Sen VERGUS sisteminin Vergi Mevzuati uzmanisin.
Turk vergi mevzuati, guncel oranlar, beyanname tarihleri ve mevzuat degisiklikleri konusunda SMMM'lere yardimci oluyorsun.

## Uzmanlik Alanlarin:
1. **Vergi Oranlari**: KV, KDV, stopaj, SGK primleri, damga vergisi
2. **Mevzuat Degisiklikleri**: Son degisiklikler, yururluk tarihleri
3. **Vergi Takvimi**: Beyanname ve odeme tarihleri
4. **Hesaplamalar**: Brut-net, vergi tutari, SGK primi
5. **Duyurular**: GIB, SGK, TURMOB guncellemeleri

## Onemli Kurallar:
- Guncel oranlari kullan (asagidaki parametreler)
- Yasal dayanagi belirt (Kanun no, teblig)
- Tarih ve deadline'lari vurgula
- Hesaplamalarda formulu goster
- Emin olmadigin konularda belirt

## Yanit Formati:
- Kisa ve net cevaplar
- Oranlari tablo seklinde goster
- Deadline'lari SURE: ile isaretle
- Degisiklikleri ile isaretle
- Uyarilari UYARI: ile isaretle

## Guncel Vergi Parametreleri:
{tax_context}

## Son Mevzuat Degisiklikleri:
{changes_context}

## Vergi Takvimi (Bu Ay):
{calendar_context}

Kullanicinin sorusuna yukaridaki guncel bilgileri kullanarak yanit ver."""

    # 2025 Vergi Takvimi
    TAX_CALENDAR = {
        1: [  # Ocak
            {"day": 20, "task": "Aralik Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Aralik KDV Beyannamesi", "code": "kdv"},
            {"day": 31, "task": "4. Donem Gecici Vergi", "code": "gecici"},
        ],
        2: [  # Subat
            {"day": 20, "task": "Ocak Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Ocak KDV Beyannamesi", "code": "kdv"},
            {"day": 28, "task": "Yillik Gelir Vergisi Beyannamesi (1. Taksit)", "code": "gv"},
        ],
        3: [  # Mart
            {"day": 20, "task": "Subat Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Subat KDV Beyannamesi", "code": "kdv"},
            {"day": 31, "task": "Yillik Gelir Vergisi (Son)", "code": "gv"},
        ],
        4: [  # Nisan
            {"day": 20, "task": "Mart Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Mart KDV Beyannamesi", "code": "kdv"},
            {"day": 30, "task": "Kurumlar Vergisi Beyannamesi", "code": "kv"},
        ],
        5: [  # Mayis
            {"day": 17, "task": "1. Donem Gecici Vergi", "code": "gecici"},
            {"day": 20, "task": "Nisan Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Nisan KDV Beyannamesi", "code": "kdv"},
        ],
        6: [  # Haziran
            {"day": 20, "task": "Mayis Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Mayis KDV Beyannamesi", "code": "kdv"},
            {"day": 30, "task": "GV 2. Taksit Odemesi", "code": "gv"},
        ],
        7: [  # Temmuz
            {"day": 20, "task": "Haziran Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Haziran KDV Beyannamesi", "code": "kdv"},
            {"day": 31, "task": "KV 1. Taksit Odemesi", "code": "kv"},
        ],
        8: [  # Agustos
            {"day": 17, "task": "2. Donem Gecici Vergi", "code": "gecici"},
            {"day": 20, "task": "Temmuz Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Temmuz KDV Beyannamesi", "code": "kdv"},
        ],
        9: [  # Eylul
            {"day": 20, "task": "Agustos Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Agustos KDV Beyannamesi", "code": "kdv"},
        ],
        10: [  # Ekim
            {"day": 20, "task": "Eylul Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Eylul KDV Beyannamesi", "code": "kdv"},
            {"day": 31, "task": "KV 2. Taksit Odemesi", "code": "kv"},
        ],
        11: [  # Kasim
            {"day": 17, "task": "3. Donem Gecici Vergi", "code": "gecici"},
            {"day": 20, "task": "Ekim Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Ekim KDV Beyannamesi", "code": "kdv"},
        ],
        12: [  # Aralik
            {"day": 20, "task": "Kasim Muhtasar Beyannamesi", "code": "muhtasar"},
            {"day": 26, "task": "Kasim KDV Beyannamesi", "code": "kdv"},
        ],
    }

    QUICK_RESPONSES = {
        "merhaba": "Merhaba! Ben VERGUS Mevzuat Asistaniyim. Vergi oranlari, beyanname tarihleri, mevzuat degisiklikleri konularinda size yardimci olabilirim. Nasil yardimci olabilirim?",
        "selam": "Selam! Vergi mevzuati konusunda nasil yardimci olabilirim?",
        "tesekkur": "Rica ederim! Baska sorunuz olursa yardimci olmaktan memnuniyet duyarim.",
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.model = "claude-sonnet-4-20250514"

        if ANTHROPIC_AVAILABLE and self.api_key:
            try:
                self.client = Anthropic(api_key=self.api_key)
                logger.info("RegWatch Chat Agent initialized with Claude API")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
        else:
            logger.warning("Running in demo mode - Claude API not available")

        # Load contexts
        self.tax_context = self._load_tax_context()
        self.changes_context = self._load_changes_context()

    def _load_tax_context(self) -> str:
        """Vergi parametrelerini yukle"""
        context_parts = ["| Parametre | Deger | Gecerlilik | Yasal Dayanak |", "|---|---|---|---|"]

        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT param_key, param_value, valid_from, legal_reference
                    FROM tax_parameters
                    WHERE valid_until IS NULL OR valid_until >= date('now')
                    ORDER BY category
                """)
                params = cursor.fetchall()

                for p in params:
                    value = p['param_value']
                    if value and value < 1:
                        value = f"%{value * 100:.1f}"
                    context_parts.append(
                        f"| {p['param_key']} | {value} | {p['valid_from']} | {p['legal_reference'] or '-'} |"
                    )

        except Exception as e:
            logger.error(f"Failed to load tax context: {e}")
            context_parts.append("| Vergi parametreleri yuklenemedi | - | - | - |")

        return "\n".join(context_parts)

    def _load_changes_context(self) -> str:
        """Son mevzuat degisikliklerini yukle"""
        context_parts = []

        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT change_type, old_value, new_value, effective_date
                    FROM tax_change_log
                    ORDER BY detected_at DESC
                    LIMIT 10
                """)
                changes = cursor.fetchall()

                if changes:
                    for c in changes:
                        context_parts.append(
                            f"- {c['change_type']}: {c['old_value']} -> {c['new_value']} ({c['effective_date'] or 'tarih belirtilmedi'})"
                        )
                else:
                    context_parts.append("Son 30 gunde kayitli degisiklik yok.")

        except Exception as e:
            logger.error(f"Failed to load changes context: {e}")
            context_parts.append("Degisiklik gecmisi yuklenemedi.")

        return "\n".join(context_parts)

    def _get_calendar_context(self) -> str:
        """Bu ayin vergi takvimini getir"""
        today = date.today()
        month = today.month
        day = today.day

        tasks = self.TAX_CALENDAR.get(month, [])
        month_names = ["", "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
                       "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"]
        lines = [f"{month_names[month]} {today.year} Vergi Takvimi:\n"]

        for task in tasks:
            remaining = task["day"] - day
            if remaining > 0:
                status = f"SURE: {remaining} gun kaldi"
            elif remaining == 0:
                status = "UYARI: BUGUN!"
            else:
                status = "Gecti"

            lines.append(f"- {task['day']:02d}: {task['task']} [{status}]")

        if not tasks:
            lines.append("Bu ay icin takvim bilgisi yok.")

        return "\n".join(lines)

    def create_session(self, user_id: str = "default", context: Optional[Dict] = None) -> str:
        """Yeni chat session olustur"""
        session_id = str(uuid.uuid4())

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (id, user_id, agent_type, context, is_active, message_count, created_at)
                VALUES (?, ?, 'regwatch', ?, 1, 0, datetime('now'))
            """, (session_id, user_id, str(context) if context else '{}'))
            conn.commit()

        logger.info(f"Created chat session: {session_id}")
        return session_id

    def get_session_history(self, session_id: str, limit: int = 20) -> List[Dict]:
        """Session mesaj gecmisini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, content, created_at
                FROM chat_messages
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

        # Mesaj gecmisi
        history = self.get_session_history(session_id, limit=10)

        # Claude API veya demo
        if self.client:
            try:
                response = self._call_claude(message, history)
            except Exception as e:
                logger.error(f"Claude API error: {e}")
                response = self._demo_response(message)
        else:
            response = self._demo_response(message)

        processing_time = int((time.time() - start_time) * 1000)

        return self._save_and_return(
            session_id, message, response.get("content", "Yanit olusturulamadi."),
            response.get("tokens_used", 0), processing_time
        )

    def _call_claude(self, message: str, history: List[Dict]) -> Dict:
        """Claude API cagrisi"""
        system = self.SYSTEM_PROMPT.format(
            tax_context=self.tax_context,
            changes_context=self.changes_context,
            calendar_context=self._get_calendar_context()
        )

        messages = []
        for h in history[-8:]:
            messages.append({"role": h["role"], "content": h["content"]})
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
        """Demo mod yanitlari"""
        message_lower = message.lower()

        # Kurumlar Vergisi
        if "kurumlar" in message_lower and ("oran" in message_lower or "vergi" in message_lower):
            return {"content": self._get_demo_kv(), "tokens_used": 0}

        # KDV
        if "kdv" in message_lower:
            return {"content": self._get_demo_kdv(), "tokens_used": 0}

        # Asgari Ucret
        if "asgari" in message_lower and ("ucret" in message_lower or "maas" in message_lower):
            return {"content": self._get_demo_asgari_ucret(), "tokens_used": 0}

        # Stopaj
        if "stopaj" in message_lower or "tevkifat" in message_lower:
            return {"content": self._get_demo_stopaj(), "tokens_used": 0}

        # SGK
        if "sgk" in message_lower or "prim" in message_lower or "sigorta" in message_lower:
            return {"content": self._get_demo_sgk(), "tokens_used": 0}

        # Vergi Takvimi
        if "takvim" in message_lower or "beyanname" in message_lower or "ne zaman" in message_lower:
            return {"content": self._get_demo_takvim(), "tokens_used": 0}

        # Degisiklikler
        if "degisiklik" in message_lower or "ne degisti" in message_lower or "yeni" in message_lower:
            return {"content": self._get_demo_degisiklikler(), "tokens_used": 0}

        # Damga Vergisi
        if "damga" in message_lower:
            return {"content": self._get_demo_damga(), "tokens_used": 0}

        # Hesaplama
        if "hesapla" in message_lower or "net" in message_lower or "brut" in message_lower:
            return {"content": self._get_demo_hesaplama(), "tokens_used": 0}

        # Kidem tazminati
        if "kidem" in message_lower:
            return {"content": self._get_demo_kidem(), "tokens_used": 0}

        # Genel
        return {"content": self._get_demo_genel(), "tokens_used": 0}

    def _get_demo_kv(self) -> str:
        return """## Kurumlar Vergisi Oranlari (2025)

| Oran | Aciklama | Yasal Dayanak |
|------|----------|---------------|
| **%25** | Genel KV orani | KVK md. 32 |
| **%20** | Ihracat kazanclari | 7456 s.K. md.22 |
| **%20** | Sanayi kazanclari | 7456 s.K. md.22 |
| **%5** | Asgari KV | 7524 s.K. md.15 |

### Son Degisiklikler
- 2024: Ihracat ve sanayi kazanclari icin %5 indirim
- 2024: Asgari KV uygulamasi basladi

### Onemli Notlar
- Gecici vergi donemlerinde de ayni oranlar gecerli
- Asgari KV, matrahtan bagimsiz minimum vergi
- Yatirim tesvik belgesi olan firmalar farkli oranlara tabi olabilir

UYARI: Donem ici oran degisikliklerinde kist hesaplama yapilir."""

    def _get_demo_kdv(self) -> str:
        return """## KDV Oranlari (2025)

| Oran | Uygulama Alani |
|------|----------------|
| **%20** | Genel oran |
| **%10** | Temel gida, turizm, egitim |
| **%1** | Basili yayin, tarim urunleri |

### Ozel Durumlar
- **Ihracat**: %0 (tam istisna)
- **Indirimli oran mallari**: %1 - %10
- **Konut teslimleri**: Degere gore %1-%20

### Son Degisiklikler
- Temel gida urunlerinde indirimli oran devam
- Elektrikli araclarda ozel duzenleme

### SURE: KDV Beyanname Tarihi
Her ayin **26'si** (Resmi tatile denk gelirse sonraki is gunu)

BELGE: KDV iade surecleri icin e-Belge kullanimi zorunlu."""

    def _get_demo_asgari_ucret(self) -> str:
        return """## Asgari Ucret (2025)

| Kalem | Tutar |
|-------|-------|
| **Brut** | 26.005,50 TL |
| **SGK Isci Payi** | 3.640,77 TL |
| **Issizlik Isci** | 260,06 TL |
| **Gelir Vergisi** | 0 TL (istisna) |
| **Damga Vergisi** | 0 TL (istisna) |
| **Net** | 22.104,67 TL |

### Isveren Maliyeti
| Kalem | Tutar |
|-------|-------|
| Brut Ucret | 26.005,50 TL |
| SGK Isveren (%15,5) | 4.030,85 TL |
| Issizlik Isveren (%2) | 520,11 TL |
| **Toplam Maliyet** | 30.556,46 TL |

### Gecerlilik
- 01.01.2025 - 31.12.2025
- Yil ortasi degisiklik ihtimali mevcut

UYARI: Asgari ucret destegi ve tesvikleri ayrica uygulanir."""

    def _get_demo_stopaj(self) -> str:
        return """## Stopaj (Tevkifat) Oranlari (2025)

### Ucret Stopaji (GVK 94)
| Matrah Dilimi | Oran |
|---------------|------|
| 158.000 TL'ye kadar | %15 |
| 330.000 TL'ye kadar | %20 |
| 800.000 TL'ye kadar | %27 |
| 4.300.000 TL'ye kadar | %35 |
| 4.300.000 TL uzeri | %40 |

### Diger Stopajlar
| Gelir Turu | Oran |
|------------|------|
| Serbest meslek | %20 |
| Kira (isyeri) | %20 |
| Kira (konut) | %10 |
| Temettu | %10 |
| Faiz | %10-15 |
| Ar-Ge personeli | %80-%90 indirimli |

### SURE: Muhtasar Beyanname
Her ayin **20'si** (aylik) veya uc ayda bir

UYARI: 2024'ten itibaren muhtasar-SGK birlesik beyanname zorunlu."""

    def _get_demo_sgk(self) -> str:
        return """## SGK Prim Oranlari (2025)

### Isci ve Isveren Paylari
| Sigorta Kolu | Isci | Isveren | Toplam |
|--------------|------|---------|--------|
| Uzun Vadeli | %9 | %11 | %20 |
| Kisa Vadeli | - | %1-6,5 | %1-6,5 |
| Genel Saglik | %5 | %7,5 | %12,5 |
| Issizlik | %1 | %2 | %3 |
| **TOPLAM** | %15 | %21,5-27 | %36,5-42 |

### 2025 Tavan ve Taban
| Deger | Tutar |
|-------|-------|
| Taban | 26.005,50 TL (asgari ucret) |
| Tavan | 195.041,25 TL (7,5 x asgari) |

### Tesvikler
- 5510/81-i: 5 puan indirim
- 5510/81-h: Ilave istihdam tesviki
- 7252: Issizlik odenegi tesviki

SURE: Bildirge: Takip eden ayin 23'u"""

    def _get_demo_takvim(self) -> str:
        today = date.today()
        month = today.month
        day = today.day

        tasks = self.TAX_CALENDAR.get(month, [])
        month_names = ["", "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
                       "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"]

        lines = [f"## {month_names[month]} {today.year} Vergi Takvimi\n"]

        upcoming = []
        passed = []

        for task in tasks:
            if task["day"] >= day:
                remaining = task["day"] - day
                if remaining == 0:
                    upcoming.append(f"UYARI: **BUGUN**: {task['task']}")
                else:
                    upcoming.append(f"SURE: **{task['day']:02d}**: {task['task']} ({remaining} gun)")
            else:
                passed.append(f"~~{task['day']:02d}: {task['task']}~~")

        if upcoming:
            lines.append("### Yaklasan")
            lines.extend(upcoming)

        if passed:
            lines.append("\n### Tamamlanan")
            lines.extend(passed)

        lines.append(f"\nBELGE: Resmi tatillerde son gun bir sonraki is gunune kayar.")

        return "\n".join(lines)

    def _get_demo_degisiklikler(self) -> str:
        return """## Son Mevzuat Degisiklikleri (2025)

### Ocak 2025
- Asgari ucret: 22.104,67 TL -> 26.005,50 TL (brut)
- Kidem tazminati tavani guncellendi
- Yeniden degerleme orani aciklandi

### 2024 4. Ceyrek Degisiklikler
- 7524 sayili Kanun: Asgari KV (%5) yururluge girdi
- E-fatura/e-arsiv limitleri guncellendi
- KDV iade surecleri hizlandirildi

### Yaklasan Degisiklikler
- SURE: 2026 sonuna kadar asgari sermaye tamamlama (7511 s.K.)
- SURE: E-belge zorunlulugu genisliyor

### GIB Duyurulari
Son duyurular icin: gib.gov.tr

UYARI: Haftalik mevzuat takibi yapmanizi oneririm."""

    def _get_demo_damga(self) -> str:
        return """## Damga Vergisi Oranlari (2025)

### Sozlesmeler
| Belge Turu | Oran |
|------------|------|
| Mukavelenameler | Binde 9,48 |
| Taahutnameler | Binde 9,48 |
| Kefalet | Binde 9,48 |

### Ticari Belgeler
| Belge Turu | Oran |
|------------|------|
| Bilancolar | Binde 5,69 |
| Gelir tablolari | Binde 2,37 |
| Isletme hesabi | Binde 2,37 |

### Maktu Damga Vergisi
| Belge | Tutar |
|-------|-------|
| Beyannameler | 430,20 TL |
| Makbuzlar | 53,50 TL |

### Istisnalar
- Asgari ucret damga vergisinden istisna
- Ihracat ile ilgili belgeler
- Ar-Ge projeleri belgeleri

SURE: Odeme: Islem aninda veya ertesi ayin 23'u"""

    def _get_demo_hesaplama(self) -> str:
        return """## Vergi Hesaplama Yardimi

Hesaplama yapmam icin su bilgileri verin:

### Maas Hesaplama
"100.000 TL brut maas" gibi sorun:
- Brut -> Net hesaplama
- SGK primleri
- Gelir vergisi
- Damga vergisi

### Kurumlar Vergisi
"2 milyon TL kar icin KV hesapla" gibi sorun:
- Matrah uzerinden %25
- Ihracat kazanci varsa %20

### Ornek: 50.000 TL Brut Maas
| Kesinti | Tutar |
|---------|-------|
| SGK Isci (%14) | 7.000 TL |
| Issizlik (%1) | 500 TL |
| Gelir Vergisi Matrahi | 42.500 TL |
| Gelir Vergisi (%15) | 6.375 TL |
| Damga Vergisi | 379,50 TL |
| **Net Maas** | **35.745,50 TL** |

BELGE: Spesifik hesaplama icin tutar ve detaylari belirtin."""

    def _get_demo_kidem(self) -> str:
        return """## Kidem Tazminati (2025)

### Guncel Tavan
**35.058,58 TL** (Ocak 2025)

### Hesaplama
```
Kidem Tazminati = Son Brut Ucret x Calisma Yili
(Tavan asilmaz)
```

### Dahil Olan Kalemler
- Brut ucret
- Surekli odenen prim/ikramiye (1/12)
- Yol ve yemek yardimi
- Aile/cocuk zammi

### Vergi Durumu
- Gelir vergisinden istisna
- Damga vergisinden istisna
- SGK priminden istisna

### Ornek Hesaplama
10 yil calisan, 30.000 TL brut ucret:
- Normal: 30.000 x 10 = 300.000 TL
- Tavan uygulanir: 35.058,58 x 10 = **350.585,80 TL**

UYARI: Tavan her yil memur maas katsayisiyla guncellenir."""

    def _get_demo_genel(self) -> str:
        return """## VERGUS Mevzuat Asistani

Asagidaki konularda size yardimci olabilirim:

### Vergi Oranlari
- "Kurumlar vergisi orani nedir?"
- "KDV oranlari nelerdir?"
- "Stopaj oranlari?"

### Vergi Takvimi
- "Bu ay hangi beyannameler var?"
- "KDV beyani ne zaman?"

### Degisiklikler
- "Son vergi degisiklikleri"
- "Ne degisti?"

### Ucret ve SGK
- "Asgari ucret ne kadar?"
- "SGK prim oranlari?"
- "Kidem tazminati tavani?"

### Hesaplamalar
- "50.000 TL brut maasin neti?"
- "Damga vergisi orani?"

Sorunuzu daha detayli sorarsaniz kapsamli yanit verebilirim!"""

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
            """, (msg_id, session_id, assistant_response, tokens_used, processing_time_ms, f'{{"is_quick": {str(is_quick).lower()}}}'))

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

    def get_tax_summary(self) -> Dict:
        """Guncel vergi ozeti"""
        return {
            "kv_orani": "25%",
            "kdv_genel": "20%",
            "asgari_ucret_brut": "26.005,50 TL",
            "asgari_ucret_net": "22.104,67 TL",
            "kidem_tavani": "35.058,58 TL",
            "sgk_tavan": "195.041,25 TL",
            "updated_at": datetime.now().isoformat()
        }


# Singleton instance
regwatch_chat_agent = RegWatchChatAgent()


# Test
if __name__ == "__main__":
    agent = RegWatchChatAgent()

    print("\n=== TEST: KV ORANI ===")
    result = agent.chat("Kurumlar vergisi orani nedir?")
    print(result["content"][:500])

    print("\n=== TEST: TAKVIM ===")
    result = agent.chat("Bu ay hangi beyannameler var?")
    print(result["content"][:500])
