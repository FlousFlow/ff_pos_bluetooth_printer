# ruff: noqa: B018
{
    "name": "Flous Flow POS Bluetooth Printer",
    "version": "19.0.1.0.0",
    "category": "Sales/Point of Sale",
    "summary": "Experimental browser BLE receipt printing for Odoo POS",
    "description": """Browser-side Bluetooth Low Energy receipt printing for Odoo 19 POS.

Requires a secure context and a browser exposing Web Bluetooth. Printer and protocol
compatibility must be verified per device. Rongta RPP30 is experimental and unverified.
""",
    "author": "Flous Flow",
    "maintainer": "Flous Flow",
    "website": "https://flousflow.com",
    "support": "support@flousflow.com",
    "images": ["static/description/cover.png"],
    "license": "LGPL-3",
    "depends": ["point_of_sale"],
    "data": [
        "security/security.xml",
        "security/ir.model.access.csv",
        "data/printer_profile_data.xml",
        "views/printer_profile_views.xml",
        "views/pos_config_views.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "ff_pos_bluetooth_printer/static/src/js/ble_transport.js",
            "ff_pos_bluetooth_printer/static/src/js/escpos_raster.js",
            "ff_pos_bluetooth_printer/static/src/js/print_coordinator.js",
            "ff_pos_bluetooth_printer/static/src/js/pos_integration.js",
            "ff_pos_bluetooth_printer/static/src/js/printer_status.js",
            "ff_pos_bluetooth_printer/static/src/js/diagnostic_wizard.js",
            "ff_pos_bluetooth_printer/static/src/xml/pos_templates.xml",
            "ff_pos_bluetooth_printer/static/src/scss/pos.scss",
        ],
    },
    "installable": True,
    "application": False,
}
