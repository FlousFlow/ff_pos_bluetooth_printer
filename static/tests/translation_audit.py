"""Static coverage audit for this addon's manually maintained POT and Arabic PO."""

import ast
import collections
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
POT = ROOT / "i18n" / "ff_pos_bluetooth_printer.pot"
AR_PO = ROOT / "i18n" / "ar.po"
TRANSLATABLE_SEED_LABELS = {
    "Rongta RPP30 (Experimental / Not Verified)",
    "Generic BLE Thermal Printer (Manual Configuration)",
}
PLACEHOLDER = re.compile(r"%\([^)]+\)[a-zA-Z]|%[sdif]|\{[^}]+\}")


def source_strings():
    found = set(TRANSLATABLE_SEED_LABELS)
    for path in (ROOT / "models").glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "fields":
                    for keyword in node.keywords:
                        if (
                            keyword.arg in {"string", "help"}
                            and isinstance(keyword.value, ast.Constant)
                            and isinstance(keyword.value.value, str)
                        ):
                            found.add(keyword.value.value)
                    if node.func.attr == "Selection" and node.args and isinstance(node.args[0], (ast.List, ast.Tuple)):
                        for pair in node.args[0].elts:
                            if (
                                isinstance(pair, ast.Tuple)
                                and len(pair.elts) > 1
                                and isinstance(pair.elts[1], ast.Constant)
                                and isinstance(pair.elts[1].value, str)
                            ):
                                found.add(pair.elts[1].value)
                if (
                    node.func.attr == "_"
                    and node.args
                    and isinstance(node.args[0], ast.Constant)
                    and isinstance(node.args[0].value, str)
                ):
                    found.add(node.args[0].value)

    for path in (ROOT / "static" / "src" / "js").glob("*.js"):
        found.update(re.findall(r'_t\("([^"\n]+)"\)', path.read_text(encoding="utf-8")))

    for path in (ROOT / "views").glob("*.xml"):
        for node in ET.parse(path).getroot().iter():
            if "string" in node.attrib:
                found.add(node.attrib["string"])
            if node.tag == "menuitem" and "name" in node.attrib:
                found.add(node.attrib["name"])
            if node.tag in {"div", "p", "label"} and node.text and node.text.strip():
                found.add(node.text.strip())

    template = ET.parse(ROOT / "static" / "src" / "xml" / "pos_templates.xml").getroot()
    for node in template.iter():
        found.update(value for key, value in node.attrib.items() if key.endswith(".translate"))
        if node.tag in {"button", "span", "li", "h4", "p", "div"} and node.text and node.text.strip():
            found.add(node.text.strip())
    return found


def entries(path):
    text = path.read_text(encoding="utf-8")
    ids = re.findall(r'^msgid "(.*)"$', text, re.MULTILINE)
    translations = re.findall(r'^msgstr "(.*)"$', text, re.MULTILINE)
    source = [value for value in ids if value]
    translated = [value for value in translations[1:] if value]
    return source, translated


def main():
    found = source_strings()
    pot_ids, _ = entries(POT)
    po_ids, po_translations = entries(AR_PO)
    missing_source = found - set(pot_ids)
    missing_catalog = set(pot_ids) - set(po_ids)
    untranslated = len(pot_ids) - len(po_translations)
    placeholder_errors = [
        source for source, translated in zip(pot_ids, po_translations)
        if collections.Counter(PLACEHOLDER.findall(source)) != collections.Counter(PLACEHOLDER.findall(translated))
    ]
    print(f"static_source_candidates={len(found)}")
    print(f"pot_entries={len(pot_ids)}")
    print(f"arabic_translated_entries={len(po_translations)}")
    print(f"missing_source_strings={len(missing_source)}")
    print(f"missing_catalog_entries={len(missing_catalog)}")
    print(f"untranslated_entries={untranslated}")
    print(f"placeholder_errors={len(placeholder_errors)}")
    for label, values in (("missing source", missing_source), ("missing catalog", missing_catalog), ("placeholder errors", placeholder_errors)):
        if values:
            print(f"{label}: {sorted(values)}")
    return int(bool(missing_source or missing_catalog or untranslated or placeholder_errors))


if __name__ == "__main__":
    sys.exit(main())
