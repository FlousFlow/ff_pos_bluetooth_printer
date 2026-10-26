# QA report

**Release snapshot:** `19.0.1.0.0` source build.

| Quality gate | Status | Evidence / blocker |
|---|---|---|
| QG-01 Odoo standards | PASS (static/install) | Odoo 19 Community `19.0-20260619` installed the addon and all declared views/data on the isolated local lab database. |
| QG-02 Python and ORM | PASS (Odoo tests) | 11 Odoo tests pass: UUID/limits, safe profile defaults, verified-profile evidence gate, timeout/company constraints, ACL/record-rule isolation, and POS loader fields/domain. |
| QG-03 JavaScript and OWL | PASS (asset bundle) / BLOCKED (browser UI) | The live Odoo POS debug bundle returned HTTP 200 (7,336,952 bytes) and contains all six addon JS modules plus the OWL XML template. Actual POS startup/rendering and browser interaction were not automated. |
| QG-04 Install/upgrade | PASS (lab) | Addon install and `-u` upgrade both completed on `ff_lab_odoo19`; the final upgrade also ran Odoo tests after adding the Apps cover image metadata. Module state is `installed`, version `19.0.1.0.0`. This was not a production database. |
| QG-05 Bluetooth mocks | PASS (mock suite) / BLOCKED (physical browser/device) | 12 Node tests exercise supported/unsupported contexts, profile gates, chooser cancellation, connection/service/characteristic failure, connection/write timeouts, chunking, partial writes, disconnect/reconnect, raster bytes, and queue serialization/deduplication. Exact Bluefy behavior and real hardware remain untested. |
| QG-06 Receipt accuracy | BLOCKED | No POS renderer/runtime or printer. Odoo `OrderReceipt` is reused; Arabic, taxes/refunds/payments, logo/QR, widths, length, and paper output require integration/hardware checks. |
| QG-07 POS regression | BLOCKED | Existing source flow inspected; no POS tours/session available. Payment/order code was not modified. Manual, automatic, fallback, reprint, multiple-config tests remain. |
| QG-08 Security | PASS (source and ORM tests) | Company rule hides another company's profile; cashier can read but cannot write; both are covered by passing Odoo tests. Manager operations were not exercised through the browser UI. |
| QG-09 Translation/RTL | PASS (catalog checks) / BLOCKED (UI) | POT/ar.po coverage, format, and placeholders checked; Arabic runtime/RTL and paper output not tested. |
| QG-10 Odoo Apps | BLOCKED | Public standalone GitHub repository and `19.0` release branch are available. Manifest includes the PNG cover and the published FlousFlow support email. Odoo Apps submission still needs real POS screenshots, final live guideline review, and product/hardware claims validated. No store submission was made. |
| QG-11 Performance | BLOCKED | Bounded 5 MiB bitmap and sequential chunks are implemented; no browser measurements, memory profiling, or timing measurements were run. |
| QG-12 Scope/integrity | PASS | Odoo core and unrelated repositories were not changed. The addon was published as the only content of the new standalone public repository, on the Odoo release branch `19.0`; the pre-existing dirty `Desktop/odoo_addons` checkout was left untouched. |

## Executed validation

- `node --test outputs/ff_pos_bluetooth_printer/static/tests/ble_transport.test.js` — **12 passed, 0 failed**.
- `docker exec ff_lab_odoo19 sh -lc 'odoo -c /etc/odoo/odoo.conf -d ff_lab_odoo19 --http-port=18074 -u ff_pos_bluetooth_printer --stop-after-init --test-enable --test-tags /ff_pos_bluetooth_printer --log-level=test'` — **11 Odoo tests passed; 0 failed, 0 errors** (Odoo reported 13 test instances including subtests). This final upgrade followed inclusion of the Apps cover path and support email in the manifest.
- `curl http://127.0.0.1:18072/web/assets/debug/point_of_sale._assets_pos.js` from the Odoo container — **HTTP 200, 7,336,952 bytes**; all 6 addon JS module definitions and the addon OWL XML template were present.
- `curl http://127.0.0.1:18072/web/login` from the Odoo container — **HTTP 200**.
- `gh repo view FlousFlow/ff_pos_bluetooth_printer` — **public repository created**; branch `19.0` pushed and configured as the default branch.
- `node --check` for all JavaScript under `static/` — **passed**.
- `ruff check outputs/ff_pos_bluetooth_printer` — **passed**.
- `python3.12 -m compileall -q outputs/ff_pos_bluetooth_printer` — **passed**.
- `msgfmt --check --check-format -o /dev/null outputs/ff_pos_bluetooth_printer/i18n/ar.po` — **passed**.
- `python3.12 static/tests/translation_audit.py` (from addon root) — **passed; 98 source candidates, 98 POT entries, 98 translated entries, no missing strings/placeholders**.
- XML parse of all 5 module XML files, manifest AST parse, and static manifest file-reference check (14 data/asset/image paths) — **passed; no missing explicit references**.
- Odoo `--test-enable --test-tags /ff_pos_bluetooth_printer` was first attempted with 8 tests; four test setup errors exposed test-fixture assumptions (`groups_id` and lab database missing an accounting chart). Fixtures were corrected to use Odoo 19 `group_ids` and test model constraints without creating an accounting-dependent POS configuration. The final rerun passed all 11 tests.

A mock BLE write is not evidence of physical output. Any test not run is identified as BLOCKED or NOT TESTED, never inferred as passed.

## Release status

- Software: `DEVELOPMENT_INCOMPLETE` pending a browser POS session/tour, cashier UI, and receipt-render regression checks.
- Hardware: `HARDWARE_NOT_VERIFIED`.
- Localization: `TRANSLATION_READY` for catalog coverage/syntax; not `TRANSLATION_TESTED` because no runtime UI check was run.
- Odoo Apps: `STORE_REQUIREMENTS_INCOMPLETE`; GitHub source branch is prepared, but no Odoo Apps upload/review/publication occurred.
