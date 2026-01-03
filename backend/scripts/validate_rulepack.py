#!/usr/bin/env python3
"""
Rulepack Validation + Manifest Generation

Validates all YAML rules against JSON Schema and generates
a deterministic pack_hash manifest.

Usage:
    python validate_rulepack.py
    python validate_rulepack.py --generate-manifest
"""

import os
import sys
import json
import yaml
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple

# Try to use jsonschema if available
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False
    print("Warning: jsonschema not installed. Running basic validation only.")

# Paths
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
RULES_DIR = BACKEND_DIR / "rules"
REGISTRY_DIR = RULES_DIR / "registry"
PACKS_DIR = RULES_DIR / "packs"
SCHEMA_PATH = RULES_DIR / "schemas" / "rule_card_schema.json"


def load_schema() -> Dict:
    """Load JSON Schema for rule validation."""
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_rule(path: Path) -> Tuple[Dict, str]:
    """Load a YAML rule file and return (data, raw_content)."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return yaml.safe_load(content), content


def validate_rule_basic(rule: Dict, filename: str) -> List[str]:
    """Basic validation without jsonschema library."""
    errors = []

    # Required fields
    required = ["rule_id", "name", "version", "category", "inputs", "algorithm"]
    for field in required:
        if field not in rule:
            errors.append(f"Missing required field: {field}")

    # Rule ID format
    if "rule_id" in rule:
        rule_id = rule["rule_id"]
        if not rule_id.startswith("R-"):
            errors.append(f"rule_id must start with 'R-': {rule_id}")

    # Category validation
    valid_categories = ["VDK_RISK", "KV_BRIDGE", "CROSS_CHECK", "INFLATION",
                       "MIZAN", "KDV", "GVK", "SGK"]
    if "category" in rule and rule["category"] not in valid_categories:
        errors.append(f"Invalid category: {rule['category']}")

    # legal_basis_refs format
    if "legal_basis_refs" in rule:
        for ref in rule["legal_basis_refs"]:
            if not ref.startswith("SRC-") or len(ref) != 8:
                errors.append(f"Invalid legal_basis_ref format: {ref}")

    # Inputs validation
    if "inputs" in rule:
        for inp in rule["inputs"]:
            if "name" not in inp:
                errors.append("Input missing 'name' field")
            if "type" not in inp:
                errors.append("Input missing 'type' field")

    return errors


def validate_rule_jsonschema(rule: Dict, schema: Dict, filename: str) -> List[str]:
    """Validate using jsonschema library."""
    errors = []
    try:
        jsonschema.validate(instance=rule, schema=schema)
    except jsonschema.ValidationError as e:
        errors.append(f"Schema validation error: {e.message}")
    except jsonschema.SchemaError as e:
        errors.append(f"Schema error: {e.message}")
    return errors


def compute_pack_hash(rules: List[Tuple[str, Dict, str]]) -> str:
    """
    Compute deterministic pack_hash.

    Hash is based on sorted rule_ids and their content hashes.
    This ensures the same rules always produce the same pack_hash.
    """
    # Sort by rule_id for determinism
    sorted_rules = sorted(rules, key=lambda x: x[1].get("rule_id", ""))

    # Create hash input
    hash_input = []
    for filename, rule, content in sorted_rules:
        rule_id = rule.get("rule_id", filename)
        # Use content hash for each rule
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
        hash_input.append(f"{rule_id}:{content_hash}")

    # Final pack hash
    combined = "|".join(hash_input)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


def generate_manifest(rules: List[Tuple[str, Dict, str]], pack_hash: str) -> Dict:
    """Generate rulepack manifest."""
    rule_summaries = []
    for filename, rule, _ in sorted(rules, key=lambda x: x[1].get("rule_id", "")):
        rule_summaries.append({
            "rule_id": rule.get("rule_id"),
            "name": rule.get("name"),
            "version": rule.get("version"),
            "category": rule.get("category"),
            "priority": rule.get("priority", "MEDIUM"),
            "legal_basis_refs": rule.get("legal_basis_refs", [])
        })

    return {
        "manifest_version": "1.0.0",
        "pack_name": "lyntos-core-rulepack",
        "pack_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pack_hash": pack_hash,
        "rule_count": len(rules),
        "categories": list(set(r.get("category") for _, r, _ in rules if r.get("category"))),
        "rules": rule_summaries
    }


def main():
    print("=" * 60)
    print("LYNTOS Rulepack Validator")
    print("=" * 60)

    # Check paths
    if not REGISTRY_DIR.exists():
        print(f"ERROR: Registry directory not found: {REGISTRY_DIR}")
        sys.exit(1)

    if not SCHEMA_PATH.exists():
        print(f"ERROR: Schema file not found: {SCHEMA_PATH}")
        sys.exit(1)

    # Load schema
    schema = load_schema()
    print(f"Schema loaded: {SCHEMA_PATH.name}")

    # Find all YAML files
    yaml_files = list(REGISTRY_DIR.glob("*.yaml")) + list(REGISTRY_DIR.glob("*.yml"))
    print(f"Found {len(yaml_files)} rule files\n")

    # Validate each rule
    all_rules = []
    valid_count = 0
    error_count = 0

    for yaml_file in sorted(yaml_files):
        try:
            rule, content = load_rule(yaml_file)
            filename = yaml_file.name

            # Validate
            if HAS_JSONSCHEMA:
                errors = validate_rule_jsonschema(rule, schema, filename)
            else:
                errors = validate_rule_basic(rule, filename)

            if errors:
                print(f"❌ {filename}")
                for err in errors:
                    print(f"   - {err}")
                error_count += 1
            else:
                print(f"✅ {filename} ({rule.get('rule_id')})")
                valid_count += 1
                all_rules.append((filename, rule, content))

        except yaml.YAMLError as e:
            print(f"❌ {yaml_file.name} - YAML parse error: {e}")
            error_count += 1
        except Exception as e:
            print(f"❌ {yaml_file.name} - Error: {e}")
            error_count += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"VALIDATION SUMMARY")
    print("=" * 60)
    print(f"Total files:  {len(yaml_files)}")
    print(f"Valid:        {valid_count}")
    print(f"Errors:       {error_count}")

    if error_count > 0:
        print("\n⚠️  Some rules failed validation. Please fix errors above.")
        sys.exit(1)

    # Generate pack hash
    pack_hash = compute_pack_hash(all_rules)
    print(f"\n🔐 Pack Hash: {pack_hash}")

    # Generate manifest if requested or by default
    if "--generate-manifest" in sys.argv or len(sys.argv) == 1:
        manifest = generate_manifest(all_rules, pack_hash)

        # Ensure packs directory exists
        PACKS_DIR.mkdir(parents=True, exist_ok=True)

        manifest_path = PACKS_DIR / "core_manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        print(f"\n📦 Manifest generated: {manifest_path}")
        print(f"   Rules: {manifest['rule_count']}")
        print(f"   Categories: {', '.join(manifest['categories'])}")

    print("\n✅ All rules validated successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
