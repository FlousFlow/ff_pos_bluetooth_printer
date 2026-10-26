# Physical hardware test plan

**Current status: BLOCKED / NOT TESTED.** No physical RPP30 or Bluefy/iPhone session was available. Do not mark any physical step PASS without dated evidence from the device.

## Before connecting

1. Install this addon in a disposable Odoo 19 test database and use a test POS.
2. On the iPhone, install/update Bluefy from its official source, open the HTTPS POS URL, and confirm in the browser UI that `navigator.bluetooth` exists and `isSecureContext` is true. If either fails, stop: this transport cannot operate in that environment.
3. Obtain the RPP30 BLE GATT service UUID and writable characteristic UUID from Rongta's official SDK/manual or a BLE inspection utility. Record exact firmware and source. Do not guess; include optional notification UUID only if vendor documentation identifies one.
4. Verify the printer's command protocol and continuous-receipt/raster mode from the exact device manual. The profile field must remain `Not Selected` until that evidence exists.
5. Enter the verified UUIDs and values in a company-scoped profile. Select ESC/POS Raster only after device/protocol evidence supports it. Keep Manual mode and native fallback on.

## Test record

For every row, record date/time, iPhone model, iOS version, Bluefy version, Odoo revision, printer firmware, profile UUID source, expected result, actual result, and a photo/video or sanitized browser diagnostic where relevant. Do not include customer receipts in evidence.

| # | Test | Expected result | Status | Evidence / actual result |
|---:|---|---|---|---|
| 1 | Browser support + secure context | UI reports available API and secure context | NOT TESTED | |
| 2 | Printer discovery | User selects the intended RPP30 in browser chooser | NOT TESTED | |
| 3 | GATT connection | Device GATT connects within configured timeout | NOT TESTED | |
| 4 | Authorized service | Configured service is accessible; failure is recorded as authorization/configuration issue, not proof of absent hardware service | NOT TESTED | |
| 5 | Write characteristic | Characteristic exists and exposes a supported write method | NOT TESTED | |
| 6 | Test data transmission | Binary test raster resolves; addon labels it unconfirmed | NOT TESTED | |
| 7 | Physical test page | Human sees legible paper output; record width, alignment, feed, and quality | NOT TESTED | |
| 8 | English | Receipt content matches Odoo-rendered test order | NOT TESTED | |
| 9 | Arabic | Connected Arabic glyphs, direction, punctuation, and amounts render correctly | NOT TESTED | |
| 10 | Mixed Arabic/English | Mixed scripts and product codes retain correct order | NOT TESTED | |
| 11 | Manual POS receipt | Existing Print Receipt action routes once and retains Odoo values | NOT TESTED | |
| 12 | Automatic receipt | One job after payment; payment remains successful if printer is unavailable | NOT TESTED | |
| 13 | Long receipt | Full output or explicit size rejection; no silent clipping | NOT TESTED | |
| 14 | Reprint | Cashier-triggered reprint submits a new job exactly when requested | NOT TESTED | |
| 15 | Power off during transfer | Job becomes uncertain; no automatic whole-receipt replay | NOT TESTED | |
| 16 | Reconnect | User reconnects after disconnect and sees current state | NOT TESTED | |
| 17 | Partial transfer | Error reports failure/uncertainty; cashier inspects paper before retry | NOT TESTED | |
| 18 | Multiple POS sessions | No stale GATT object is reused across page sessions | NOT TESTED | |

## BLE UUID discovery

Ask Rongta for the BLE GATT profile for the exact RPP30 model/firmware and request: primary service UUID, write characteristic UUID, whether writes require response, maximum accepted attribute payload, notifications/acknowledgements, and the printer command documentation for continuous paper. Alternatively use a BLE inspection app to connect and enumerate services/characteristics, then compare those results with the vendor SDK. A service not visible through Web Bluetooth may be un-authorized or filtered by the browser; that alone does not prove that the printer lacks it.
