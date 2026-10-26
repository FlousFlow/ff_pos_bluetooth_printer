# Compatibility matrix

| Platform/device | Status | Evidence / remaining work |
|---|---|---|
| Odoo Community 19.0 | Installed and tested | Inspected local `19.0` source revision `7a74539a`; addon installed and upgraded on local Odoo `19.0-20260619` lab database; Odoo tests and POS debug asset bundle passed. No browser POS tour was run. |
| Odoo Enterprise | Not target / not verified | Addon depends only on `point_of_sale`, but not validated in Enterprise. |
| iPhone / Bluefy | Not tested | Browser Web Bluetooth API behavior, secure-context behavior, transfer API availability, and gesture permission must be checked on the target phone/version. |
| iOS Safari | Unsupported claim | No native Safari support is claimed. |
| iOS Chrome | Unsupported claim | No native Chrome iOS support is claimed. |
| Rongta RPP30 | Experimental / hardware not verified | Official Rongta materials list Bluetooth and ESC/CPCL/TSPL, but this addon has no verified BLE UUID, writable characteristic, Web Bluetooth procedure, or tested receipt-mode encoding. |
| Generic BLE thermal printer | Manual configuration / not tested | Requires confirmed GATT UUIDs and a protocol proven for the exact printer. |
| ESC/POS raster adapter | Explicit compatibility gate / not universally supported | Encoder creates the standard GS-v-0 raster form, but the actual printer implementation must be confirmed before use. |
| CPCL and TSPL | Not implemented | No encoder in this release. These command languages are not interchangeable with a receipt raster protocol. |

Official Rongta product/download references: [RPP30 product information](https://www.rongtatech.com/portable-label-printer-rpp30_p97.html), [Rongta download page](https://www.rongtatech.com/download/11/), and [Rongta programming manuals](https://www.rongtatech.cn/en/sdk/). Product-level command-language claims do not establish GATT UUIDs or browser compatibility.
