# Translation audit

## Catalog coverage

- Source catalog: `i18n/ff_pos_bluetooth_printer.pot`.
- Target catalog: `i18n/ar.po` (Arabic locale `ar`).
- The local source-string audit found 98 user-facing source strings, all present in the POT; the catalog also contains 98 entries, with Arabic translations for all 98.
- Reproducible check from the addon root: `python3.12 static/tests/translation_audit.py`.
- Odoo's runtime translation export/extraction was not executable in this workspace, so the static scan is independent of Odoo's extraction tool.
- Validation command: `msgfmt --check --check-format -o /dev/null i18n/ar.po`.
- Placeholder audit: the current catalog contains no printf-style placeholders; therefore no mismatched placeholder names were found by static inspection.
- Frontend language registration is implemented through `_get_translation_frontend_modules_name()` in `models/ir_http.py`.

## Runtime and RTL status

Static catalog syntax and string coverage were validated. Odoo installation loaded the frontend translation hook, but Arabic-language POS runtime, language switching, OWL layout, small-screen RTL, mixed Arabic/English, and physical receipt glyph shaping are **NOT TESTED** because no browser POS session or printer was exercised. Browser rasterization preserves the rendered Odoo DOM as pixels; this does not constitute Arabic paper-output verification.

## Coverage boundary

The POT is manually maintained for the source strings present in this release; extraction was not run through Odoo's translation export command. Any newly added user-facing text must be added to both catalogs and this audit updated. Translation readiness here means complete catalog coverage and syntax only, not runtime localization testing.
