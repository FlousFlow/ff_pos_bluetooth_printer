# Architecture and Odoo 19 integration

## Source inspected

The local Odoo Community checkout inspected for this addon is revision `7a74539a` on branch `19.0`. The checkout was clean during inspection. No core files were changed.

| Concern | Odoo 19 source / extension point | Addon behavior |
|---|---|---|
| POS assets | `addons/point_of_sale/__manifest__.py`, bundle `point_of_sale._assets_pos` | Addon JS, OWL XML, and SCSS are included in the POS bundle. |
| POS config loading | `addons/point_of_sale/models/pos_config.py`, `_load_pos_data_fields`; `addons/point_of_sale/models/pos_session.py`, `_load_pos_data_models` | Loads only this POS's Bluetooth profile and its configuration fields. |
| Printer service | `addons/point_of_sale/static/src/app/services/pos_printer_service.js`, registered as `printer` | The addon keeps the original `PosStore.printReceipt` path for disabled/native fallback operation. |
| Receipt data/rendering | `addons/point_of_sale/static/src/app/services/pos_store.js`, `printReceipt`; `OrderReceipt` at `static/src/app/screens/receipt_screen/receipt/order_receipt.js` | Renders Odoo's existing `OrderReceipt` through the existing renderer and converts that raster to binary. Totals are not recalculated. |
| Manual receipt/reprint | `ReceiptScreen` and `TicketScreen` call `pos.printReceipt()` | The narrow `PosStore.printReceipt` patch intercepts receipt calls only while this POS setting is enabled. |
| Automatic receipt | `addons/point_of_sale/static/src/app/utils/order_payment_validation.js`, `canPrintReceipt` and `afterOrderValidation` | A narrow `PosConfig.autoPrint` getter extension enables the existing automatic flow; a narrow marker patch identifies its one auto-print invocation for deduplication. It does not change payment validation or await/fail payment on printer I/O. |
| Frontend translation | `addons/point_of_sale/models/ir_http.py`, `_get_translation_frontend_modules_name` | Adds this module to the frontend translation module list. |
| Native fallback | `PosStore.printReceipt` → registered printer service; `PrinterService.printHtml` | If Bluetooth is disabled/unavailable or the profile cannot be used, the standard Odoo printer path is called when fallback is enabled. A transfer with uncertain partial writes is never resent via native fallback automatically. |

## Addon components

- `ff.pos.printer.profile`: company-scoped profile with administrator-managed service/characteristic UUIDs, protocol gate, dimensions, chunk size, and delays. The shipped Rongta profile has no guessed UUIDs and no selected protocol.
- `pos.config`: per-POS enable, manual/automatic mode, timeouts, fallback preference, raster setting, and diagnostic toggle.
- `BleTransport`: browser support/security checks, user-gesture discovery, explicit service authorization, GATT validation, bounded writes, disconnect tracking, and privacy-limited diagnostics.
- `encodeEscPosRaster`: converts an Odoo-rendered canvas to a bounded monochrome GS-v-0 raster payload. It is available only after explicit `ESC/POS Raster` selection on a profile; this is not asserted to work with every ESC printer.
- `PrintCoordinator`: one ordered transmission at a time; automatic order UUID dedupe; no automatic resend after an uncertain write.
- `PosStore.printReceipt` integration: routes existing Odoo receipt HTML and keeps original native printing available.
- `BluetoothPrinterStatus` and `BluetoothDiagnosticWizard`: compact POS controls and a six-step browser/GATT/test/human-confirmation flow. Diagnostic report copying is gated by the per-POS diagnostic setting.

## Patch sensitivity

Two narrow framework patches are used: `PosStore.printReceipt` to preserve Odoo receipt values while routing the existing print event, and `PosConfig.autoPrint` plus `OrderPaymentValidation.afterOrderValidation` to participate in Odoo's existing auto-print lifecycle. They are based on the inspected Odoo 19 revision and must be rechecked on later Odoo updates. No patch changes order validation, payment, stock, accounting, synchronization, or fiscal operations.

## Important limitation

Printer acknowledgement handling, protocol-specific CPCL/TSPL encoders, a separate printer-details popup, and real-world raster-to-paper validation are not implemented. The diagnostic wizard's final stage asks a person to confirm paper output; that confirmation is local to the current browser session and is not saved as verification evidence. The module is a software development build, not a verified physical printer driver.
