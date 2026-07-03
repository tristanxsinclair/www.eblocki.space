from pathlib import Path
from collections import defaultdict
import json
import re
from datetime import datetime

ROOT = Path.cwd()
SRC = ROOT / "src"
DOCS = ROOT / "docs" / "release"
OUT = DOCS / "eblocki-python-upgrade-audit.md"
JSON_OUT = DOCS / "eblocki-python-upgrade-audit.json"

SCAN_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md"}

RAW_LABELS = [
    "law_max",
    "sales_retail_tgg",
    "psych_hd",
    "LAW_MAX",
    "PSYCH_HD",
    "SALES_RETAIL_TGG",
    "PRODUCT_SYSTEM_REVIEW",
    "EXECUTION_LOCK",
    "GENERAL_EXECUTION",
    "AUSTRALIAN_TECH_LAW_AI_GOVERNANCE",
    "accepted_strong",
    "accepted_useful",
    "accepted_minimum",
    "elite_evidence",
]

VISIBLE_UI_PATTERNS = [
    r"\{[^}]*\.domain[^}]*\}",
    r"\{[^}]*\.mode[^}]*\}",
    r"\{[^}]*mode_id[^}]*\}",
    r"\{[^}]*verdict[^}]*\}",
    r"\.toUpperCase\(\)",
    r"Strongest:",
    r"Weakest:",
    r"identity escalation",
]

MOBILE_RISK_PATTERNS = [
    r"w-\[\d+px\]",
    r"min-w-\[\d+px\]",
    r"grid-cols-\d",
    r"whitespace-nowrap",
    r"overflow-x-auto",
    r"table-fixed",
]

QUALITY_RISK_PATTERNS = [
    r":\s*any\b",
    r"as any\b",
    r"console\.log",
    r"TODO",
    r"FIXME",
    r"catch\s*\([^)]*\)\s*\{\s*\}",
    r"// eslint-disable",
]

IMPORTANT_ROUTES = [
    "Dashboard.tsx",
    "Proof.tsx",
    "Coach.tsx",
    "GameForge.tsx",
    "Onboarding.tsx",
    "StartToday.tsx",
    "ProofWeek.tsx",
]

def iter_files():
    for base in [SRC, ROOT / "supabase", ROOT / "scripts", ROOT / "docs"]:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in SCAN_EXTS:
                if "node_modules" not in path.parts and "dist" not in path.parts:
                    yield path

def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")

def line_hits(path: Path, terms_or_patterns, regex=False):
    hits = []
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        return hits

    for i, line in enumerate(lines, start=1):
        for item in terms_or_patterns:
            if regex:
                if re.search(item, line):
                    hits.append({"line": i, "match": item, "text": line.strip()[:220]})
            else:
                if item in line:
                    hits.append({"line": i, "match": item, "text": line.strip()[:220]})
    return hits

def classify_visibility(path: Path, hit_text: str) -> str:
    p = rel(path).lower()
    text = hit_text.lower()

    if "/__tests__/" in p or p.endswith(".test.ts") or p.endswith(".test.tsx"):
        return "test/internal"
    if "/lib/" in p and not any(x in text for x in ["label", "display", "title", "headline", "description"]):
        return "likely internal logic"
    if any(x in p for x in ["/pages/", "/components/"]):
        return "visible-ui candidate"
    return "unknown"

def main():
    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "root": str(ROOT),
        "raw_label_hits": defaultdict(list),
        "visible_ui_pattern_hits": defaultdict(list),
        "mobile_risk_hits": defaultdict(list),
        "quality_risk_hits": defaultdict(list),
        "important_routes_present": {},
        "package_scripts": {},
        "recommendations": [],
    }

    package_json = ROOT / "package.json"
    if package_json.exists():
        try:
            pkg = json.loads(package_json.read_text(encoding="utf-8"))
            report["package_scripts"] = pkg.get("scripts", {})
        except Exception as e:
            report["package_scripts_error"] = str(e)

    for route in IMPORTANT_ROUTES:
        matches = list(SRC.rglob(route)) if SRC.exists() else []
        report["important_routes_present"][route] = [rel(m) for m in matches]

    for path in iter_files():
        raw_hits = line_hits(path, RAW_LABELS, regex=False)
        if raw_hits:
            for h in raw_hits:
                h["classification"] = classify_visibility(path, h["text"])
            report["raw_label_hits"][rel(path)].extend(raw_hits)

        ui_hits = line_hits(path, VISIBLE_UI_PATTERNS, regex=True)
        if ui_hits and ("/pages/" in rel(path) or "/components/" in rel(path)):
            report["visible_ui_pattern_hits"][rel(path)].extend(ui_hits)

        mobile_hits = line_hits(path, MOBILE_RISK_PATTERNS, regex=True)
        if mobile_hits and ("/pages/" in rel(path) or "/components/" in rel(path)):
            report["mobile_risk_hits"][rel(path)].extend(mobile_hits)

        quality_hits = line_hits(path, QUALITY_RISK_PATTERNS, regex=True)
        if quality_hits:
            report["quality_risk_hits"][rel(path)].extend(quality_hits)

    visible_label_files = [
        f for f, hits in report["raw_label_hits"].items()
        if any(h.get("classification") == "visible-ui candidate" for h in hits)
    ]

    if visible_label_files:
        report["recommendations"].append(
            "Fix visible raw label leaks first using a display helper. Do not change stored enum/database values."
        )

    if report["mobile_risk_hits"]:
        report["recommendations"].append(
            "Review mobile-risk classes on dashboard/proof/coach/gameforge. Confirm no horizontal overflow at 375px and 550px."
        )

    if "test" in report["package_scripts"] and "build" in report["package_scripts"]:
        report["recommendations"].append(
            "Run npm.cmd run test and npm.cmd run build after each patch."
        )

    if "smoke:routes" in report["package_scripts"]:
        report["recommendations"].append(
            "Run preview on 127.0.0.1:4173 before npm.cmd run smoke:routes."
        )

    serializable = json.loads(json.dumps(report))
    JSON_OUT.write_text(json.dumps(serializable, indent=2), encoding="utf-8")

    def section(title):
        md.append(f"## {title}\n")

    def hits_block(title, data, limit=80):
        section(title)
        if not data:
            md.append("No hits found.\n")
            return
        count = 0
        for file, hits in sorted(data.items()):
            md.append(f"### `{file}`\n")
            for h in hits[:12]:
                classification = f" — {h.get('classification')}" if h.get("classification") else ""
                md.append(f"- L{h['line']} `{h['match']}`{classification}: `{h['text']}`")
                count += 1
                if count >= limit:
                    md.append("\nOutput truncated. See JSON report for full results.\n")
                    return
            md.append("")

    md = []
    md.append("# Eblocki Python Upgrade Audit\n")
    md.append(f"Generated: `{report['generated_at']}`\n")
    md.append("BLUF: This report finds upgrade targets. It does not prove app readiness. Use it to guide narrow patches, then verify with npm and browser checks.\n")

    section("Important Routes")
    for route, paths in report["important_routes_present"].items():
        if paths:
            md.append(f"- `{route}`: {', '.join(f'`{p}`' for p in paths)}")
        else:
            md.append(f"- `{route}`: missing")
    md.append("")

    section("Package Scripts")
    for name in ["test", "build", "lint", "smoke:routes", "dev", "preview"]:
        status = "present" if name in report["package_scripts"] else "missing"
        md.append(f"- `{name}`: {status}")
    md.append("")

    hits_block("Raw Internal Label Hits", report["raw_label_hits"])
    hits_block("Visible UI Pattern Hits", report["visible_ui_pattern_hits"])
    hits_block("Mobile Layout Risk Hits", report["mobile_risk_hits"])
    hits_block("Quality / Lint Risk Hits", report["quality_risk_hits"], limit=100)

    section("Recommended Next Patches")
    for rec in report["recommendations"]:
        md.append(f"- {rec}")
    if not report["recommendations"]:
        md.append("- No urgent recommendations generated by scanner.")
    md.append("")

    section("Verification Command Sequence")
    md.append("```powershell")
    md.append("npm.cmd run test")
    md.append("npm.cmd run build")
    md.append("npm.cmd run preview -- --host 127.0.0.1 --port 4173")
    md.append("# second terminal:")
    md.append("npm.cmd run smoke:routes")
    md.append("```")

    OUT.write_text("\n".join(md), encoding="utf-8")

    print(f"Audit written to: {OUT}")
    print(f"JSON written to:  {JSON_OUT}")
    print("")
    print("Top priority:")
    if visible_label_files:
        print("Fix visible raw label leaks in:")
        for f in visible_label_files[:20]:
            print(f" - {f}")
    else:
        print("No visible raw label leak candidates found.")

if __name__ == "__main__":
    main()
