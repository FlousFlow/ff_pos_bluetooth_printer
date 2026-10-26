# Odoo Apps Store compliance audit

This is a pre-submission checklist, not an Odoo Apps review or publication claim. The addon source is publicly available in [FlousFlow/ff_pos_bluetooth_printer](https://github.com/FlousFlow/ff_pos_bluetooth_printer/tree/19.0) on the Odoo 19 version branch. Official pages: [Apps upload](https://apps.odoo.com/apps/upload) and [vendor guidelines](https://apps.odoo.com/apps/vendor-guidelines). The upload page returned rate limiting during this task; recheck live requirements before submission. Odoo's upload page describes registering Git repositories with a version ref such as `#19.0`.

| Requirement | Artifact / validation | Status |
|---|---|---|
| Odoo 19 version, manifest metadata, license, dependency | `__manifest__.py`; parsed and checked locally | PASS (static) |
| Publisher and website | Flous Flow / `https://flousflow.com` in manifest | PASS (static) |
| Support address, if required by listing | `support@flousflow.com` in manifest; published on FlousFlow's [terms/contact page](https://mizan.flousflow.com/terms) | PASS (published company contact) |
| License and original assets | LGPL-3 selected; icon drawn for this module; no bundled third-party JS/fonts | PASS (source review) |
| English description page | `static/description/index.html`; English, local assets only, no script/CDN | PASS (static) |
| Icon and branded cover graphic | `static/description/icon.png`, `static/description/cover.png`; cover included in manifest `images` | PASS (PNG files; cover clearly says experimental/hardware not verified) |
| Screenshot from functioning POS | Addon is installed on a local lab database, but a POS browser session was not opened | BLOCKED; capture accurate screenshots from the running POS |
| Truthful claims and experimental hardware status | Store page labels RPP30 unverified; no iOS Safari/Chrome or Odoo certification claim | PASS (source review) |
| No runtime code download, telemetry, or unauthorized collection | Reviewed source; none implemented | PASS (source review) |
| Functional completeness and installability | Addon install/update and Odoo ORM tests passed in the local lab; browser/POS and physical tests remain | PASS (install/update); BLOCKED (full functional evidence) |
| GitHub release source | Public standalone repository, branch `19.0` | PASS; version branch available for vendor registration |
| Apps review/publication | No upload or submission was performed | NOT SUBMITTED; not published |

## Publication blockers / next actions

1. Complete browser POS regression checks against an Odoo 19 database, including manual/automatic/native fallback behavior.
2. Complete physical Bluefy/RPP30 testing and accurately disclose the result.
3. Capture real screenshots from the installed module; do not submit mockups as proof.
4. Confirm support-contact metadata requirements and add only an approved contact address.
5. Re-open the official upload/vendor pages and rerun the submission checklist. No App Store submission was made.
