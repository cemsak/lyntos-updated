#!/usr/bin/env python3
"""
LYNTOS Kural Kütüphanesi Migrasyon Scripti
==========================================
Bu script mevcut JSON/YAML kural dosyalarını veritabanına migrate eder.

Kaynaklar:
- /backend/data/kurgan_rules.json (7 KURGAN kuralı)
- /backend/rules/registry/*.yaml (25 temel kural)
- /backend/rules/registry/vdk/*.yaml (25 VDK kuralı - K-* ve RAM-*)

KUTSAL KİTAP KURALLARI:
- ❌ Hallucination YASAK
- ❌ Eksik veri gizleme YASAK
- ⚠️ Her kural %100 doğru migrate edilmeli

Kullanım:
    python scripts/migrate_rules_to_db.py [--dry-run] [--verbose]
"""

import json
import yaml
import sqlite3
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "database" / "lyntos.db"
KURGAN_JSON = BACKEND_DIR / "data" / "kurgan_rules.json"
RULES_REGISTRY = BACKEND_DIR / "rules" / "registry"
RULES_VDK = RULES_REGISTRY / "vdk"


class RuleMigrator:
    """Kural migrasyon sınıfı"""

    def __init__(self, dry_run: bool = False, verbose: bool = False):
        self.dry_run = dry_run
        self.verbose = verbose
        self.stats = {
            "yaml_rules": 0,
            "json_rules": 0,
            "duplicates_detected": 0,
            "migrated": 0,
            "skipped": 0,
            "errors": 0
        }
        self.duplicates: List[Tuple[str, str, str]] = []
        self.all_rules: Dict[str, Dict[str, Any]] = {}

    def connect_db(self) -> sqlite3.Connection:
        """Veritabanı bağlantısı"""
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn

    def load_yaml_rules(self) -> Dict[str, Dict[str, Any]]:
        """YAML kurallarını yükle"""
        rules = {}

        # Kök dizindeki YAML'ler
        for yaml_file in RULES_REGISTRY.glob("*.yaml"):
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    if data and 'rule_id' in data:
                        rule_id = data['rule_id']
                        data['source_file'] = str(yaml_file.relative_to(BACKEND_DIR))
                        data['source_type'] = 'yaml'
                        rules[rule_id] = data
                        self.stats["yaml_rules"] += 1
                        if self.verbose:
                            logger.info(f"  Loaded YAML: {rule_id} from {yaml_file.name}")
            except Exception as e:
                logger.error(f"Error loading {yaml_file}: {e}")
                self.stats["errors"] += 1

        # VDK alt dizinindeki YAML'ler
        if RULES_VDK.exists():
            for yaml_file in RULES_VDK.glob("*.yaml"):
                try:
                    with open(yaml_file, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        if data and 'rule_id' in data:
                            rule_id = data['rule_id']
                            data['source_file'] = str(yaml_file.relative_to(BACKEND_DIR))
                            data['source_type'] = 'yaml'
                            rules[rule_id] = data
                            self.stats["yaml_rules"] += 1
                            if self.verbose:
                                logger.info(f"  Loaded VDK YAML: {rule_id} from {yaml_file.name}")
                except Exception as e:
                    logger.error(f"Error loading {yaml_file}: {e}")
                    self.stats["errors"] += 1

        return rules

    def load_kurgan_rules(self) -> Dict[str, Dict[str, Any]]:
        """KURGAN JSON kurallarını yükle"""
        rules = {}

        if not KURGAN_JSON.exists():
            logger.warning(f"KURGAN JSON not found: {KURGAN_JSON}")
            return rules

        try:
            with open(KURGAN_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for rule in data.get('rules', []):
                rule_id = rule.get('id')
                if rule_id:
                    # JSON formatını normalize et
                    normalized = {
                        'rule_id': rule_id,
                        'name': rule.get('name', ''),
                        'name_tr': rule.get('name', ''),
                        'category': rule.get('category', 'KURGAN'),
                        'severity': rule.get('severity', 'MEDIUM').upper(),
                        'priority': rule.get('severity', 'MEDIUM').upper(),
                        'description': rule.get('description', ''),
                        'algorithm': json.dumps(rule.get('calculation', {})),
                        'accounts': json.dumps(rule.get('accounts', [])),
                        'sector_thresholds': json.dumps(rule.get('sector_thresholds', {})),
                        'inspector_questions': json.dumps(rule.get('inspector_questions', [])),
                        'answer_templates': json.dumps(rule.get('answer_templates', [])),
                        'required_documents': json.dumps(rule.get('required_documents', [])),
                        'legal_refs': json.dumps(rule.get('legal_references', [])),
                        'source_file': str(KURGAN_JSON.relative_to(BACKEND_DIR)),
                        'source_type': 'json'
                    }
                    rules[rule_id] = normalized
                    self.stats["json_rules"] += 1
                    if self.verbose:
                        logger.info(f"  Loaded KURGAN JSON: {rule_id}")

        except Exception as e:
            logger.error(f"Error loading KURGAN JSON: {e}")
            self.stats["errors"] += 1

        return rules

    def detect_duplicates(self) -> List[Tuple[str, str, str]]:
        """Duplicate kuralları tespit et"""
        duplicates = []

        # Bilinen duplicate'lar
        known_duplicates = [
            ("K-09", "R-001", "Kasa riski/şişkinliği kontrolü"),
            ("K-15", "R-131", "Ortaklar cari hesap kontrolü"),
            ("K-22", "R-150", "Stok devir hızı analizi"),
            ("K-31", "R-131", "Alacak analizi overlap"),
        ]

        for dup in known_duplicates:
            if dup[0] in self.all_rules and dup[1] in self.all_rules:
                duplicates.append(dup)
                self.stats["duplicates_detected"] += 1
                logger.warning(f"  DUPLICATE: {dup[0]} <-> {dup[1]} ({dup[2]})")

        return duplicates

    def normalize_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Kuralı veritabanı formatına normalize et"""

        def to_json(val):
            if val is None:
                return '[]' if isinstance(val, list) else '{}'
            if isinstance(val, (list, dict)):
                return json.dumps(val, ensure_ascii=False)
            return val

        return {
            'rule_id': rule.get('rule_id', ''),
            'name': rule.get('name', ''),
            'name_tr': rule.get('name_tr', rule.get('name', '')),
            'version': rule.get('version', '1.0.0'),
            'category': rule.get('category', 'UNKNOWN'),
            'priority': (rule.get('priority') or 'MEDIUM').upper(),
            'severity': (rule.get('severity') or rule.get('priority') or 'MEDIUM').upper(),
            'description': rule.get('description', ''),
            'algorithm': rule.get('algorithm', ''),
            'thresholds': to_json(rule.get('thresholds', {})),
            'inputs': to_json(rule.get('inputs', [])),
            'outputs': to_json(rule.get('outputs', [])),
            'accounts': to_json(rule.get('accounts', [])),
            'sector_thresholds': to_json(rule.get('sector_thresholds', {})),
            'inspector_questions': to_json(rule.get('inspector_questions', [])),
            'answer_templates': to_json(rule.get('answer_templates', [])),
            'required_documents': to_json(rule.get('required_documents', [])),
            'legal_refs': to_json(rule.get('legal_basis_refs', rule.get('legal_refs', []))),
            'test_cases': to_json(rule.get('test_cases', [])),
            'evidence_required': to_json(rule.get('evidence_required', [])),
            'source_type': rule.get('source_type', 'yaml'),
            'source_file': rule.get('source_file', ''),
            'is_active': 1,
            'is_deprecated': 0,
            'created_at': rule.get('created_at', datetime.now().isoformat()),
            'updated_at': datetime.now().isoformat()
        }

    def migrate_rules(self, conn: sqlite3.Connection):
        """Kuralları veritabanına migrate et"""
        cursor = conn.cursor()

        for rule_id, rule_data in self.all_rules.items():
            try:
                normalized = self.normalize_rule(rule_data)

                if self.dry_run:
                    logger.info(f"  [DRY-RUN] Would migrate: {rule_id}")
                    self.stats["migrated"] += 1
                    continue

                # UPSERT - varsa güncelle, yoksa ekle
                cursor.execute("""
                    INSERT INTO rules (
                        rule_id, name, name_tr, version, category, priority, severity,
                        description, algorithm, thresholds, inputs, outputs, accounts,
                        sector_thresholds, inspector_questions, answer_templates,
                        required_documents, legal_refs, test_cases, evidence_required,
                        source_type, source_file, is_active, is_deprecated,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(rule_id) DO UPDATE SET
                        name = excluded.name,
                        name_tr = excluded.name_tr,
                        version = excluded.version,
                        category = excluded.category,
                        priority = excluded.priority,
                        severity = excluded.severity,
                        description = excluded.description,
                        algorithm = excluded.algorithm,
                        thresholds = excluded.thresholds,
                        inputs = excluded.inputs,
                        outputs = excluded.outputs,
                        accounts = excluded.accounts,
                        sector_thresholds = excluded.sector_thresholds,
                        inspector_questions = excluded.inspector_questions,
                        answer_templates = excluded.answer_templates,
                        required_documents = excluded.required_documents,
                        legal_refs = excluded.legal_refs,
                        test_cases = excluded.test_cases,
                        evidence_required = excluded.evidence_required,
                        source_type = excluded.source_type,
                        source_file = excluded.source_file,
                        updated_at = excluded.updated_at
                """, (
                    normalized['rule_id'],
                    normalized['name'],
                    normalized['name_tr'],
                    normalized['version'],
                    normalized['category'],
                    normalized['priority'],
                    normalized['severity'],
                    normalized['description'],
                    normalized['algorithm'],
                    normalized['thresholds'],
                    normalized['inputs'],
                    normalized['outputs'],
                    normalized['accounts'],
                    normalized['sector_thresholds'],
                    normalized['inspector_questions'],
                    normalized['answer_templates'],
                    normalized['required_documents'],
                    normalized['legal_refs'],
                    normalized['test_cases'],
                    normalized['evidence_required'],
                    normalized['source_type'],
                    normalized['source_file'],
                    normalized['is_active'],
                    normalized['is_deprecated'],
                    normalized['created_at'],
                    normalized['updated_at']
                ))

                self.stats["migrated"] += 1
                if self.verbose:
                    logger.info(f"  Migrated: {rule_id}")

            except Exception as e:
                logger.error(f"Error migrating {rule_id}: {e}")
                self.stats["errors"] += 1

    def save_duplicates(self, conn: sqlite3.Connection):
        """Duplicate bilgilerini kaydet"""
        if not self.duplicates:
            return

        cursor = conn.cursor()

        for dup in self.duplicates:
            if self.dry_run:
                logger.info(f"  [DRY-RUN] Would save duplicate: {dup[0]} <-> {dup[1]}")
                continue

            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO rule_duplicates (
                        rule_id_1, rule_id_2, overlap_type, overlap_description, resolution
                    ) VALUES (?, ?, ?, ?, ?)
                """, (dup[0], dup[1], 'duplicate', dup[2], 'pending'))
            except Exception as e:
                logger.error(f"Error saving duplicate {dup}: {e}")

    def run(self):
        """Migrasyon işlemini çalıştır"""
        logger.info("=" * 60)
        logger.info("LYNTOS Kural Kütüphanesi Migrasyon Başlıyor")
        logger.info("=" * 60)

        if self.dry_run:
            logger.info("🔍 DRY-RUN modu aktif - Veritabanına yazılmayacak")

        # 1. YAML kurallarını yükle
        logger.info("\n📄 YAML kuralları yükleniyor...")
        yaml_rules = self.load_yaml_rules()
        self.all_rules.update(yaml_rules)

        # 2. KURGAN JSON kurallarını yükle
        logger.info("\n📄 KURGAN JSON kuralları yükleniyor...")
        json_rules = self.load_kurgan_rules()
        self.all_rules.update(json_rules)

        # 3. Duplicate'ları tespit et
        logger.info("\n🔍 Duplicate kurallar tespit ediliyor...")
        self.duplicates = self.detect_duplicates()

        # 4. Veritabanına migrate et
        logger.info("\n💾 Kurallar veritabanına migrate ediliyor...")
        conn = self.connect_db()
        try:
            self.migrate_rules(conn)
            self.save_duplicates(conn)

            if not self.dry_run:
                conn.commit()
                logger.info("✅ Commit başarılı")
        except Exception as e:
            logger.error(f"Migration error: {e}")
            conn.rollback()
        finally:
            conn.close()

        # 5. Sonuç raporu
        logger.info("\n" + "=" * 60)
        logger.info("📊 MİGRASYON SONUÇ RAPORU")
        logger.info("=" * 60)
        logger.info(f"  YAML kuralları: {self.stats['yaml_rules']}")
        logger.info(f"  JSON kuralları: {self.stats['json_rules']}")
        logger.info(f"  TOPLAM: {len(self.all_rules)}")
        logger.info(f"  Migrate edilen: {self.stats['migrated']}")
        logger.info(f"  Duplicate tespit: {self.stats['duplicates_detected']}")
        logger.info(f"  Hatalar: {self.stats['errors']}")

        if self.duplicates:
            logger.info("\n⚠️ TESPİT EDİLEN DUPLICATE'LAR:")
            for dup in self.duplicates:
                logger.info(f"  - {dup[0]} <-> {dup[1]}: {dup[2]}")

        logger.info("\n" + "=" * 60)

        return self.stats


def main():
    import argparse
    parser = argparse.ArgumentParser(description='LYNTOS Kural Migrasyon Scripti')
    parser.add_argument('--dry-run', action='store_true', help='Sadece simüle et, veritabanına yazma')
    parser.add_argument('--verbose', '-v', action='store_true', help='Detaylı çıktı')
    args = parser.parse_args()

    migrator = RuleMigrator(dry_run=args.dry_run, verbose=args.verbose)
    stats = migrator.run()

    # Exit code
    if stats["errors"] > 0:
        exit(1)
    exit(0)


if __name__ == "__main__":
    main()
