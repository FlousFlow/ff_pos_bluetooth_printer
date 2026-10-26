# Odoo standards compliance report

Target: the local Community Odoo 19 checkout at revision `7a74539a` (`19.0`) and runtime `19.0-20260619`. The addon was installed and upgraded on local test database `ff_lab_odoo19`; no production database was used. Official documentation URLs were queried; search results were available for manifest, assets, services, registries, and vendor guidelines, but direct retrieval of several documentation pages timed out or returned HTTP 429. This report therefore distinguishes source inspection/runtime validation from blocked full page retrieval.

| Requirement | Official source | Decision / code | Verification | Status |
|---|---|---|---|---|
| Module metadata and dependency | [Odoo 19 manifests](https://www.odoo.com/documentation/19.0/developer/reference/backend/module.html) | `__manifest__.py`; only `point_of_sale` dependency | Python AST parse + dependency cross-check against local Odoo tree | PASS (static) |
| Odoo coding conventions | [Coding guidelines](https://www.odoo.com/documentation/19.0/contributing/development/coding_guidelines.html) | Standard model inheritance; no core edits | Source review and syntax parse; docs direct page timed out | PASS (source conventions), docs page verification BLOCKED |
| POS configuration and ORM | Local `addons/point_of_sale/models/pos_config.py`, `pos_session.py` | `_inherit`; `_load_pos_data_fields`, `_load_pos_data_models`; company-checked profile relation | Installed/updated on Odoo 19 lab; 11 Odoo tests pass, including constraints, ACL/rule, POS loader fields/domain | PASS (lab) |
| POS assets | [Odoo 19 assets](https://www.odoo.com/documentation/19.0/developer/reference/frontend/assets.html) and local `point_of_sale.__manifest__` | `point_of_sale._assets_pos` | Odoo debug asset endpoint returned HTTP 200 and included all 6 JS modules and the XML template | PASS (bundle load), POS browser runtime BLOCKED |
| Frontend service and registry | [Services](https://www.odoo.com/documentation/19.0/developer/reference/frontend/services.html), [registries](https://www.odoo.com/documentation/19.0/developer/reference/frontend/registries.html) | Addon service registered in `registry.category("services")` | JS parse and Node tests; live Odoo POS asset bundle contains service module | PASS (static/unit/bundle), browser boot BLOCKED |
| POS receipt/manual reprint | Local `pos_store.js`, `printer_service.js`, `receipt_screen.js`, `ticket_screen.js` | Narrow patch at `PosStore.printReceipt` | Static extension-point inspection; no Odoo POS runtime | PASS (source inspection), integration BLOCKED |
| Automatic printing | Local `order_payment_validation.js` and `pos_config.js` | Extend `autoPrint`; marker only; payment code is not changed | Static inspection; no POS regression tour | PASS (source inspection), integration BLOCKED |
| Frontend translations | Local `point_of_sale/models/ir_http.py` | Add addon module to frontend translation hook | Module install, source inspection, POT/PO audit; no Arabic POS browser request | PASS (static/catalog), RTL runtime BLOCKED |
| POS native fallback | Local `pos_printer_service.js` | Core print path used when disabled, profile unsupported, or fallback selected | Static code review; physical printer unavailable | PASS (source-level), behavior BLOCKED |
| POS printer application documentation | [Odoo ePOS printers](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/configuration/epos_printers.html) | Bluetooth is independent of existing ePOS/IOT printers | Direct page timed out; local Odoo printer path inspected | BLOCKED (official page retrieval) |
| Apps upload/vendor rules | [Upload](https://apps.odoo.com/apps/upload), [vendor guidelines](https://apps.odoo.com/apps/vendor-guidelines) | Public standalone GitHub repository on version branch `19.0`; no claim of approval | GitHub repo/branch verified; Odoo Apps upload endpoint rate-limited; no submission | BLOCKED (listing/screenshots/final review/submission) |

## Design blueprint implemented

Data layer: one profile model; no persistent print-job model or database storage of browser connection objects. Configuration is stored on `pos.config`; browser-only job queue is in memory. Security loads profile read-only for POS users and allows changes only for POS managers, with company record rules.

Extension order: backend config/profile → ACL/rule and seed profiles → views → POS data loader → BLE transport → explicit raster adapter → local coordinator → Odoo receipt integration → translations/docs.

## Source extension point evidence

The Odoo source shows `PosStore.printReceipt()` rendering `OrderReceipt` with the standard `printer` service and incrementing `nb_print` only for a successful result. `OrderPaymentValidation.canPrintReceipt` checks `pos.config.autoPrint`; `afterOrderValidation` calls `pos.printReceipt` only after order finalization. The addon routes within those existing seams and never changes order/payment validation logic.
