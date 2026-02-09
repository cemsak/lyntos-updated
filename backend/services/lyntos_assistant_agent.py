"""
LYNTOS Birlesik Asistan Agent
Faz 2+4 - Vergi + Mevzuat + Sirketler Hukuku Uzmani

Demo mod YOK - API key yoksa hata firlatilir.
Faz 4: Dinamik kontekst zenginlestirme + musteri verisi.
"""
import os
import json
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
from services.assistant_context import build_enriched_context

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LyntosAssistantAgent:
    """LYNTOS Birlesik AI Asistan - Vergi, Mevzuat, Sirketler Hukuku"""

    SYSTEM_PROMPT = """Sen LYNTOS platformunun yapay zeka asistanisin.
SMMM ve YMM'lere vergi, mevzuat ve sirketler hukuku konularinda yardimci oluyorsun.

## Uzmanlik Alanlarin:

### 1. Vergi Mevzuati
- KV, KDV, stopaj, SGK primleri, damga vergisi oranlari
- Vergi beyanname tarihleri ve takvimi
- Vergi hesaplamalari (brut-net, vergi tutari, SGK primi)
- GIB, SGK, TURMOB duyurulari

### 2. Sirketler Hukuku (TTK)
- Sirket kurulusu (A.S., Ltd.Sti., Kooperatif)
- Sermaye artirimi/azaltimi, TTK 376 analizi
- Birlesme, bolunme, tur degisikligi, tasfiye
- Genel kurul toplanti ve karar nisaplari
- Her islem icin gerekli evraklar

### 3. Vergi Avantajlari ve Tesvikler
- KVK md.19-20 devir/birlesme istisnalari
- KVK md.5/1-e isinmaz/istirak satisi istisnasi
- KVK md.32/A yatirim tesvik indirimli KV
- KDVK md.17/4-c birlesme/devir KDV istisnasi
- Ar-Ge, Teknopark, OSB, ihracat tesvikleri
- Sektor bazli vergi avantajlari

### 4. Mevzuat Degisiklikleri
- Son mevzuat guncellemeleri
- Yururluk tarihleri ve etkileri
- Resmi Gazete, GIB tebligleri

## Onemli Kurallar:
- DAIMA yasal dayanagi belirt (kanun maddesi, teblig no)
- Sureleri ve deadline'lari vurgula
- Vergisel avantajlari ve riskleri ayrintili acikla
- En az vergi odenecek yolu mutlaka goster
- Pratik, uygulamaya donuk oneriler ver
- Emin olmadigin konularda "bir uzmana danismanizi oneririm" de
- Turkce karakterleri dogru kullan

## Yanit Formati:
- Kisa ve net cevaplar ver
- Madde madde listele
- Onemli uyarilari **UYARI:** ile isaretle
- Deadline'lari **SURE:** ile isaretle
- Yasal dayanaklari **KAYNAK:** ile isaretle

## Guncel Bilgi Tabani:

### Vergi Parametreleri:
{tax_context}

### Son Mevzuat Degisiklikleri:
{changes_context}

### Vergi Takvimi:
{calendar_context}

### Sirket Islemleri:
{corporate_context}

### Son Mevzuat Kayitlari:
{mevzuat_context}

Kullanicinin sorusuna yukaridaki guncel bilgileri kullanarak kapsamli yanit ver.
Bilgi tabaninda olmayan konularda genel mevzuat bilgini kullan."""

    # 2025 Vergi Takvimi
    TAX_CALENDAR = {
        1: [
            {"day": 20, "task": "Aralik Muhtasar Beyannamesi"},
            {"day": 26, "task": "Aralik KDV Beyannamesi"},
            {"day": 31, "task": "4. Donem Gecici Vergi"},
        ],
        2: [
            {"day": 20, "task": "Ocak Muhtasar Beyannamesi"},
            {"day": 26, "task": "Ocak KDV Beyannamesi"},
            {"day": 28, "task": "Yillik Gelir Vergisi (1. Taksit)"},
        ],
        3: [
            {"day": 20, "task": "Subat Muhtasar Beyannamesi"},
            {"day": 26, "task": "Subat KDV Beyannamesi"},
            {"day": 31, "task": "Yillik Gelir Vergisi (Son)"},
        ],
        4: [
            {"day": 20, "task": "Mart Muhtasar Beyannamesi"},
            {"day": 26, "task": "Mart KDV Beyannamesi"},
            {"day": 30, "task": "Kurumlar Vergisi Beyannamesi"},
        ],
        5: [
            {"day": 17, "task": "1. Donem Gecici Vergi"},
            {"day": 20, "task": "Nisan Muhtasar Beyannamesi"},
            {"day": 26, "task": "Nisan KDV Beyannamesi"},
        ],
        6: [
            {"day": 20, "task": "Mayis Muhtasar Beyannamesi"},
            {"day": 26, "task": "Mayis KDV Beyannamesi"},
            {"day": 30, "task": "GV 2. Taksit Odemesi"},
        ],
        7: [
            {"day": 20, "task": "Haziran Muhtasar Beyannamesi"},
            {"day": 26, "task": "Haziran KDV Beyannamesi"},
            {"day": 31, "task": "KV 1. Taksit Odemesi"},
        ],
        8: [
            {"day": 17, "task": "2. Donem Gecici Vergi"},
            {"day": 20, "task": "Temmuz Muhtasar Beyannamesi"},
            {"day": 26, "task": "Temmuz KDV Beyannamesi"},
        ],
        9: [
            {"day": 20, "task": "Agustos Muhtasar Beyannamesi"},
            {"day": 26, "task": "Agustos KDV Beyannamesi"},
        ],
        10: [
            {"day": 20, "task": "Eylul Muhtasar Beyannamesi"},
            {"day": 26, "task": "Eylul KDV Beyannamesi"},
            {"day": 31, "task": "KV 2. Taksit Odemesi"},
        ],
        11: [
            {"day": 17, "task": "3. Donem Gecici Vergi"},
            {"day": 20, "task": "Ekim Muhtasar Beyannamesi"},
            {"day": 26, "task": "Ekim KDV Beyannamesi"},
        ],
        12: [
            {"day": 20, "task": "Kasim Muhtasar Beyannamesi"},
            {"day": 26, "task": "Kasim KDV Beyannamesi"},
        ],
    }

    QUICK_RESPONSES = {
        "merhaba": "Merhaba! Ben LYNTOS Asistaniyim. Vergi, mevzuat ve sirketler hukuku konularinda size yardimci olabilirim. Nasil yardimci olabilirim?",
        "selam": "Selam! Vergi, mevzuat veya sirketler hukuku konusunda nasil yardimci olabilirim?",
        "tesekkurler": "Rica ederim! Baska bir sorunuz olursa yardimci olmaktan memnuniyet duyarim.",
        "tesekkur": "Rica ederim! Baska sorunuz var mi?",
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.model = "claude-sonnet-4-20250514"

        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError(
                "anthropic paketi yuklu degil. pip install anthropic"
            )

        if not self.api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY bulunamadi. .env dosyasini kontrol edin."
            )

        try:
            self.client = Anthropic(api_key=self.api_key)
            logger.info("LYNTOS Assistant Agent initialized with Claude API")
        except Exception as e:
            raise RuntimeError(f"Anthropic client olusturulamadi: {e}")

        # Kontekst verilerini yukle
        self.tax_context = self._load_tax_context()
        self.changes_context = self._load_changes_context()
        self.corporate_context = self._load_corporate_context()

    def _load_tax_context(self) -> str:
        """Vergi parametrelerini DB'den yukle"""
        lines = [
            "| Parametre | Deger | Gecerlilik | Yasal Dayanak |",
            "|---|---|---|---|",
        ]
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT param_key, param_value, valid_from, legal_reference
                    FROM tax_parameters
                    WHERE valid_until IS NULL OR valid_until >= date('now')
                    ORDER BY category
                """)
                for p in cursor.fetchall():
                    value = p['param_value']
                    if value and value < 1:
                        value = f"%{value * 100:.1f}"
                    lines.append(
                        f"| {p['param_key']} | {value} | "
                        f"{p['valid_from']} | {p['legal_reference'] or '-'} |"
                    )
        except Exception as e:
            logger.error(f"Tax context load error: {e}")
            lines.append("| Vergi parametreleri yuklenemedi | - | - | - |")
        return "\n".join(lines)

    def _load_changes_context(self) -> str:
        """Son mevzuat degisikliklerini yukle"""
        parts = []
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT change_type, old_value, new_value, effective_date
                    FROM tax_change_log
                    ORDER BY detected_at DESC LIMIT 10
                """)
                changes = cursor.fetchall()
                if changes:
                    for c in changes:
                        parts.append(
                            f"- {c['change_type']}: {c['old_value']} -> "
                            f"{c['new_value']} ({c['effective_date'] or '-'})"
                        )
                else:
                    parts.append("Son 30 gunde kayitli degisiklik yok.")
        except Exception as e:
            logger.error(f"Changes context load error: {e}")
            parts.append("Degisiklik gecmisi yuklenemedi.")
        return "\n".join(parts)

    def _load_corporate_context(self) -> str:
        """Sirket islemleri bilgisini DB'den yukle"""
        parts = []
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM corporate_event_types WHERE is_active = 1"
                )
                events = cursor.fetchall()
                for event in events:
                    ed = dict(event)
                    company_types = json.loads(ed.get('company_types') or '[]')
                    required_docs = json.loads(
                        ed.get('required_documents') or '[]'
                    )
                    parts.append(
                        f"### {ed['event_name']} ({ed['event_code']})\n"
                        f"- Sirket Tipleri: {', '.join(company_types) or 'Tumu'}\n"
                        f"- Yasal Dayanak: {ed.get('legal_basis') or '-'}\n"
                        f"- Tescil Suresi: {ed.get('registration_deadline') or '-'} gun\n"
                        f"- Belgeler: {', '.join(required_docs) or '-'}\n"
                        f"- GK Nisabi: {ed.get('gk_quorum') or '-'}\n"
                    )
        except Exception as e:
            logger.error(f"Corporate context load error: {e}")
            parts.append("Sirket islemleri veritabani yuklenemedi.")

        parts.append(
            "\n## Onemli Esikler:\n"
            "- A.S. asgari sermaye: 250.000 TL\n"
            "- Ltd. asgari sermaye: 50.000 TL\n"
            "- Tamamlama suresi: 31.12.2026\n"
            "- TTK 376/1: Sermayenin yarisi kayip -> GK\n"
            "- TTK 376/2: 2/3 kayip -> artirma veya tasfiye\n"
            "- TTK 376/3: Borca batiklik -> mahkeme (IIK 179)\n"
        )
        return "\n".join(parts)

    def _load_mevzuat_context(self) -> str:
        """Son mevzuat kayitlarini yukle"""
        parts = []
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT baslik, mevzuat_type, kurum,
                           resmi_gazete_tarih, kisa_aciklama, src_code
                    FROM mevzuat_refs
                    WHERE is_active = 1
                    ORDER BY created_at DESC
                    LIMIT 15
                """)
                refs = cursor.fetchall()
                if refs:
                    for r in refs:
                        rd = dict(r)
                        parts.append(
                            f"- [{rd.get('mevzuat_type', '')}] "
                            f"{rd.get('baslik', '')} "
                            f"({rd.get('kurum', '')}, "
                            f"{rd.get('resmi_gazete_tarih', '')})"
                        )
                else:
                    parts.append("Mevzuat kaydi bulunamadi.")
        except Exception as e:
            logger.error(f"Mevzuat context load error: {e}")
            parts.append("Mevzuat veritabani yuklenemedi.")
        return "\n".join(parts)

    def _get_calendar_context(self) -> str:
        """Bu ayin vergi takvimini olustur"""
        today = date.today()
        month = today.month
        day = today.day
        tasks = self.TAX_CALENDAR.get(month, [])
        month_names = [
            "", "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
            "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
        ]
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

    # =========================================================================
    # SESSION YONETIMI
    # =========================================================================

    def create_session(
        self, user_id: str = "default", context: Optional[Dict] = None
    ) -> str:
        session_id = str(uuid.uuid4())
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions
                    (id, user_id, agent_type, context, is_active,
                     message_count, created_at)
                VALUES (?, ?, 'lyntos_assistant', ?, 1, 0, datetime('now'))
            """, (session_id, user_id, json.dumps(context or {})))
            conn.commit()
        logger.info(f"Created assistant session: {session_id}")
        return session_id

    def get_session_history(
        self, session_id: str, limit: int = 20
    ) -> List[Dict]:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, content, created_at FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (session_id, limit))
            msgs = cursor.fetchall()
            return [
                {"role": m['role'], "content": m['content'],
                 "created_at": m['created_at']}
                for m in reversed(msgs)
            ]

    # =========================================================================
    # ANA CHAT FONKSIYONU
    # =========================================================================

    def chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        user_id: str = "default",
        client_id: Optional[str] = None,
    ) -> Dict:
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
                    is_quick=True,
                )

        # Mesaj gecmisini al
        history = self.get_session_history(session_id, limit=10)

        # Claude API cagrisi - demo mod YOK
        try:
            response = self._call_claude(message, history, client_id)
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise RuntimeError(
                f"LYNTOS Asistan su an kullanilamiyor: {str(e)}"
            )

        processing_time = int((time.time() - start_time) * 1000)
        tokens_used = response.get("tokens_used", 0)
        content = response.get("content", "Yanit olusturulamadi.")

        return self._save_and_return(
            session_id, message, content,
            tokens_used, processing_time,
        )

    def _call_claude(
        self,
        message: str,
        history: List[Dict],
        client_id: Optional[str] = None,
    ) -> Dict:
        """Claude API cagrisi - birlesik kontekst ile.
        Faz 4: Dinamik kontekst zenginlestirme."""
        mevzuat_context = self._load_mevzuat_context()
        calendar_context = self._get_calendar_context()

        system = self.SYSTEM_PROMPT.format(
            tax_context=self.tax_context,
            changes_context=self.changes_context,
            calendar_context=calendar_context,
            corporate_context=self.corporate_context,
            mevzuat_context=mevzuat_context,
        )

        # Faz 4: Dinamik kontekst zenginlestirme
        # Musteri secili ise musteri + sektor + risk bilgisi eklenir
        try:
            enriched = build_enriched_context(
                client_id=client_id,
                sector=None,  # Faz 4: ileride musterinin sektoru otomatik cekilecek
            )
            if enriched:
                system += f"\n\n## Ek Kontekst (Dinamik):\n{enriched}"
        except Exception as e:
            logger.warning(f"Enriched context yüklenemedi: {e}")

        messages = []
        for h in history[-8:]:
            messages.append({
                "role": h["role"],
                "content": h["content"],
            })
        messages.append({"role": "user", "content": message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=3000,
            system=system,
            messages=messages,
        )

        return {
            "content": response.content[0].text,
            "tokens_used": (
                response.usage.input_tokens + response.usage.output_tokens
            ),
            "model": self.model,
        }

    # =========================================================================
    # TTK 376 ANALİZİ
    # =========================================================================

    def analyze_ttk376(
        self, capital: float, legal_reserves: float, equity: float
    ) -> Dict:
        total = capital + legal_reserves
        half = total / 2
        two_thirds = total * 2 / 3

        if equity >= half:
            status = "saglikli"
            message = "Sermaye kaybi yok. Sirket saglikli durumda."
            action = None
        elif equity >= (total - two_thirds):
            status = "yari_kayip"
            loss_pct = round((1 - equity / total) * 100, 1)
            message = (
                f"Sermayenin %{loss_pct}'i kaybedilmis. "
                f"TTK 376/1 geregince Genel Kurul toplanmali."
            )
            action = "GK toplantisi yapilarak iyilestirme tedbirleri gorusulmeli."
        elif equity > 0:
            status = "ucte_iki_kayip"
            loss_pct = round((1 - equity / total) * 100, 1)
            message = (
                f"Sermayenin %{loss_pct}'i kaybedilmis. "
                f"TTK 376/2 geregince sermaye tamamlanmali veya tasfiye karari."
            )
            action = (
                "Sermaye artirimi / azaltimi veya tasfiye karari alinmali. "
                "3 ay icinde aksiyon zorunlu."
            )
        else:
            status = "borca_batik"
            message = (
                "Sirket borca batik durumda (negativ oz varlik). "
                "TTK 376/3 ve IIK 179 geregince derhal mahkemeye bildirim."
            )
            action = "Derhal iflas erteleme veya konkordato basvurusu."

        return {
            "status": status,
            "message": message,
            "action": action,
            "details": {
                "sermaye": capital,
                "yedekler": legal_reserves,
                "oz_varlik": equity,
                "toplam_sermaye_yedek": total,
                "yari_esik": half,
                "ucte_iki_esik": two_thirds,
                "kayip_orani": round((1 - equity / total) * 100, 1)
                if total > 0 else 0,
            },
            "legal_basis": "TTK md.376, IIK md.179",
        }

    # =========================================================================
    # VERGI TAKVİMİ
    # =========================================================================

    def get_tax_summary(self) -> Dict:
        """Guncel vergi ozeti"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT param_key, param_value, legal_reference
                    FROM tax_parameters
                    WHERE category IN ('kurumlar_vergisi', 'kdv', 'sgk')
                    AND (valid_until IS NULL OR valid_until >= date('now'))
                """)
                params = cursor.fetchall()
                return {
                    "parameters": [dict(p) for p in params],
                    "calendar": self.TAX_CALENDAR.get(
                        date.today().month, []
                    ),
                    "updated_at": datetime.now().isoformat(),
                }
        except Exception as e:
            logger.error(f"Tax summary error: {e}")
            return {"parameters": [], "calendar": [], "error": str(e)}

    # =========================================================================
    # YARDIMCI
    # =========================================================================

    def _save_and_return(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        tokens_used: int,
        processing_time_ms: int,
        is_quick: bool = False,
    ) -> Dict:
        msg_id = str(uuid.uuid4())
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages
                    (id, session_id, role, content, created_at)
                VALUES (?, ?, 'user', ?, datetime('now'))
            """, (str(uuid.uuid4()), session_id, user_message))

            cursor.execute("""
                INSERT INTO chat_messages
                    (id, session_id, role, content, tokens_used,
                     processing_time_ms, metadata, created_at)
                VALUES (?, ?, 'assistant', ?, ?, ?, ?, datetime('now'))
            """, (
                msg_id, session_id, assistant_response,
                tokens_used, processing_time_ms,
                json.dumps({"is_quick": is_quick}),
            ))

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
            "response": assistant_response,
            "tokens_used": tokens_used,
            "processing_time_ms": processing_time_ms,
            "model": self.model,
            "agent_type": "lyntos_assistant",
        }


# Singleton instance
try:
    lyntos_assistant_agent = LyntosAssistantAgent()
except Exception as e:
    logger.error(f"LYNTOS Assistant Agent init failed: {e}")
    lyntos_assistant_agent = None
