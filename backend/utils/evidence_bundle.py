"""
Evidence Bundle Generator for VDK Preparation
Sprint 8.2 - LYNTOS V2

Creates ZIP archive with all preparation documents for VDK inspection.
"""

import zipfile
import io
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from .pdf_export import generate_inspector_prep_pdf


class EvidenceBundleGenerator:
    """Generate evidence bundle ZIP for VDK inspection preparation"""

    def __init__(self):
        self.buffer = io.BytesIO()
        self.file_count = 0
        self.total_size = 0

    def generate(
        self,
        client_name: str,
        client_id: str,
        period: str,
        simulation_result: Dict[str, Any],
        preparation_notes: Dict[str, str],
        document_files: List[Dict[str, Any]],
        answer_templates: Dict[str, List[Dict]]
    ) -> bytes:
        """
        Generate complete evidence bundle

        Args:
            client_name: Client display name
            client_id: Client ID
            period: Analysis period
            simulation_result: KURGAN simulation result
            preparation_notes: {rule_id-question_index: note_text}
            document_files: List of {document_id, rule_id, name, file_path, status}
            answer_templates: {rule_id: [templates]}

        Returns:
            ZIP file bytes
        """

        safe_period = period.replace("/", "_")
        bundle_name = f"VDK_Kanit_Dosyasi_{client_name.replace(' ', '_')}_{safe_period}"

        with zipfile.ZipFile(self.buffer, 'w', zipfile.ZIP_DEFLATED) as zf:

            # 1. Summary report (auto-generated)
            summary = self._generate_summary(
                client_name, period, simulation_result, document_files
            )
            zf.writestr(f"{bundle_name}/00_OZET_RAPOR.txt", summary.encode('utf-8'))
            self.file_count += 1

            # 2. Q&A preparation PDF
            triggered_alarms = [a for a in simulation_result.get('alarms', []) if a.get('triggered')]

            # Build alarms with templates for PDF
            alarms_for_pdf = []
            for alarm in triggered_alarms:
                alarm_copy = dict(alarm)
                alarm_copy['answer_templates'] = answer_templates.get(alarm.get('rule_id'), [])
                alarms_for_pdf.append(alarm_copy)

            qa_pdf = generate_inspector_prep_pdf(
                client_name=client_name,
                period=period,
                alarms=alarms_for_pdf,
                notes=preparation_notes,
                document_status={d['document_id']: d['status'] for d in document_files}
            )
            zf.writestr(f"{bundle_name}/01_SORU_CEVAP_HAZIRLIGI.pdf", qa_pdf)
            self.file_count += 1

            # 3. Evidence documents organized by rule
            docs_by_rule: Dict[str, List[Dict]] = {}
            for doc in document_files:
                rule_id = doc.get('rule_id', 'OTHER')
                if rule_id not in docs_by_rule:
                    docs_by_rule[rule_id] = []
                docs_by_rule[rule_id].append(doc)

            for rule_id, docs in docs_by_rule.items():
                rule_folder = self._get_rule_folder_name(rule_id)

                for doc in docs:
                    if doc.get('status') != 'uploaded' or not doc.get('file_path'):
                        continue

                    file_path = Path(doc['file_path'])
                    if not file_path.exists():
                        continue

                    # Read and add file
                    try:
                        with open(file_path, 'rb') as f:
                            content = f.read()

                        archive_path = f"{bundle_name}/{rule_folder}/{file_path.name}"
                        zf.writestr(archive_path, content)
                        self.file_count += 1
                        self.total_size += len(content)
                    except Exception as e:
                        print(f"Error adding file {file_path}: {e}")

            # 4. Manifest file
            manifest = self._generate_manifest(
                client_name, period, simulation_result, document_files
            )
            zf.writestr(f"{bundle_name}/MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2))

        return self.buffer.getvalue()

    def _generate_summary(
        self,
        client_name: str,
        period: str,
        simulation_result: Dict,
        document_files: List[Dict]
    ) -> str:
        """Generate text summary"""

        triggered_alarms = [a for a in simulation_result.get('alarms', []) if a.get('triggered')]
        docs_ready = len([d for d in document_files if d.get('status') == 'uploaded'])
        docs_total = len(document_files)

        lines = [
            "=" * 60,
            "VDK INCELEME HAZIRLIK DOSYASI - OZET",
            "=" * 60,
            "",
            f"Mukellef: {client_name}",
            f"Donem: {period}",
            f"Olusturulma Tarihi: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            "",
            "-" * 60,
            "RISK ANALIZI",
            "-" * 60,
            f"Risk Skoru: {simulation_result.get('risk_score', 0)}/100",
            f"Risk Seviyesi: {simulation_result.get('risk_level', 'N/A').upper()}",
            f"Tetiklenen Alarm Sayisi: {len(triggered_alarms)}",
            "",
        ]

        for alarm in triggered_alarms:
            lines.append(f"  [!] {alarm.get('rule_id')}: {alarm.get('rule_name')}")
            lines.append(f"      Tespit: {alarm.get('finding_summary', 'N/A')}")
            lines.append("")

        lines.extend([
            "-" * 60,
            "BELGE DURUMU",
            "-" * 60,
            f"Hazir Belge: {docs_ready} / {docs_total}",
            f"Tamamlanma: %{int(docs_ready/docs_total*100) if docs_total else 0}",
            "",
        ])

        # List missing documents
        missing = [d for d in document_files if d.get('status') != 'uploaded']
        if missing:
            lines.append("EKSIK BELGELER:")
            for doc in missing:
                lines.append(f"  [ ] {doc.get('name', 'N/A')} ({doc.get('rule_id', '')})")

        lines.extend([
            "",
            "=" * 60,
            "Bu dosya LYNTOS VDK Simulatoru tarafindan otomatik olusturulmustur.",
            "=" * 60,
        ])

        return "\n".join(lines)

    def _get_rule_folder_name(self, rule_id: str) -> str:
        """Get folder name for a rule"""
        rule_names = {
            'K-09': 'K-09_Kasa',
            'K-15': 'K-15_Ortaklar',
            'K-22': 'K-22_Stok',
            'K-31': 'K-31_Alacak',
            'K-24': 'K-24_Amortisman',
            'TREND-MATRAH': 'TREND_Matrah',
            'K-SAHTE': 'K-SAHTE_Tedarikci',
        }
        return rule_names.get(rule_id, f"OTHER_{rule_id}")

    def _generate_manifest(
        self,
        client_name: str,
        period: str,
        simulation_result: Dict,
        document_files: List[Dict]
    ) -> Dict:
        """Generate manifest JSON"""

        return {
            "version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "generator": "LYNTOS VDK Simulator v2",
            "client": {
                "name": client_name,
                "period": period
            },
            "analysis": {
                "risk_score": simulation_result.get('risk_score'),
                "risk_level": simulation_result.get('risk_level'),
                "triggered_alarms": [
                    a.get('rule_id') for a in simulation_result.get('alarms', [])
                    if a.get('triggered')
                ]
            },
            "documents": {
                "total": len(document_files),
                "uploaded": len([d for d in document_files if d.get('status') == 'uploaded']),
                "files": [
                    {
                        "id": d.get('document_id'),
                        "name": d.get('name'),
                        "rule": d.get('rule_id'),
                        "status": d.get('status')
                    }
                    for d in document_files
                ]
            },
            "file_count": self.file_count,
            "total_size_bytes": self.total_size
        }


def generate_evidence_bundle(
    client_name: str,
    client_id: str,
    period: str,
    simulation_result: Dict,
    preparation_notes: Dict,
    document_files: List[Dict],
    answer_templates: Dict
) -> bytes:
    """Convenience function to generate evidence bundle"""
    generator = EvidenceBundleGenerator()
    return generator.generate(
        client_name=client_name,
        client_id=client_id,
        period=period,
        simulation_result=simulation_result,
        preparation_notes=preparation_notes,
        document_files=document_files,
        answer_templates=answer_templates
    )
