# Flous Flow POS Bluetooth Printer

Odoo Apps-compatible source branch: [`19.0`](https://github.com/FlousFlow/ff_pos_bluetooth_printer/tree/19.0). This is the Odoo 19 Community release branch; the module has not been submitted to or approved by Odoo Apps.

Experimental browser-side BLE printing integration for Odoo 19 Community POS. The module preserves the Odoo receipt component and payment flow, then sends a raster payload through Web Bluetooth when the cashier profile is configured.

## Requirements

- Odoo 19 Community with `point_of_sale`.
- HTTPS or another secure browser context.
- A browser that actually exposes Web Bluetooth and grants the selected service. Bluefy on iOS is the requested target, but its compatibility with this addon and the target printer is **not yet verified**.
- A device-specific GATT service UUID, writable characteristic UUID, and a supported command protocol confirmed for the exact printer model and firmware.

Rongta's product page lists Bluetooth and ESC/CPCL/TSPL command languages, but that does not establish BLE GATT UUIDs, Web Bluetooth access, ESC/POS raster compatibility, or successful receipt printing. The preloaded RPP30 profile intentionally has blank UUIDs and `Not Selected` protocol.

## Install

Copy the `ff_pos_bluetooth_printer` directory into an Odoo 19 add-ons path, ensure the configured Odoo process can read it, update the Apps list, and install **Flous Flow POS Bluetooth Printer**. No Python packages or external services are required. Use a disposable test database first. Do not install it directly on a live POS without a backup and a tested rollback plan.

## Configure

1. In Point of Sale configuration, open the intended POS and enable Bluetooth receipt printing.
2. Select a company profile or create one under Point of Sale → Bluetooth Printer Profiles.
3. Enter UUIDs obtained from the printer vendor or BLE inspector. Do not use guessed values.
4. Select `ESC/POS Raster` only after verifying that protocol and raster command for this exact printer/firmware. `Custom / Not Implemented` is intentionally blocked.
5. Start with Manual mode, conservative chunk size (for example 20 bytes), and a short inter-chunk delay. Confirm native fallback is enabled during initial trials.
6. Open the POS in a secure supported browser, connect from the POS control, then run Test Print. A successful write is only `transmitted, unconfirmed`; physically inspect the paper.
7. Only after completing the hardware test plan should Automatic mode be enabled for a controlled test POS.

## Safety behavior

- Bluetooth failure does not alter completed payments or orders.
- Automatic mode never opens the browser chooser; connect must be initiated by the cashier.
- The addon does not automatically resend a payload after any failed/uncertain GATT write. Check the printer before manually retrying to avoid duplicate paper output.
- A resolved BLE write is not a printer acknowledgement.
- Diagnostics exclude receipt contents, customer/order data, UUIDs, and permission/session tokens.
- The six-step diagnostic wizard ends with a cashier confirmation because BLE writes do not report paper output. The confirmation is not stored as hardware verification evidence.

See [DEPLOYMENT.md](DEPLOYMENT.md), [HARDWARE_TEST_PLAN.md](HARDWARE_TEST_PLAN.md), [COMPATIBILITY.md](COMPATIBILITY.md), and [QA_REPORT.md](QA_REPORT.md).
