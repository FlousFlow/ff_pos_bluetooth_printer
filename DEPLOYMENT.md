# Deployment guide

## Status and environment

The public source is [FlousFlow/ff_pos_bluetooth_printer, branch `19.0`](https://github.com/FlousFlow/ff_pos_bluetooth_printer/tree/19.0); the packaged addon is at `outputs/ff_pos_bluetooth_printer` in this delivery. Installation and upgrade were verified on the local Odoo 19 lab database `ff_lab_odoo19`. No production server, custom-addons directory, or production database was identified; commands below with `<...>` remain deployment examples and were not run against production.

## Copy and install (example)

The public release repository contains this addon at repository root. Clone its Odoo 19 branch directly into a directory named after the technical module, under an existing add-ons parent:

```sh
git clone --depth 1 --branch 19.0 https://github.com/FlousFlow/ff_pos_bluetooth_printer.git /path/to/custom-addons/ff_pos_bluetooth_printer
```

Confirm the directory name is exactly `ff_pos_bluetooth_printer`, then add that parent directory to `addons_path` if it is not already configured. Restart/reload the Odoo service only during an approved maintenance window because Python model code must be imported. From a controlled shell on the server, update the Apps list and install on a **test database**:

```sh
./odoo-bin -c /path/to/odoo.conf -d <test_database> -i ff_pos_bluetooth_printer --stop-after-init
```

For Odoo Apps vendor registration, use the repository URL with the version ref `#19.0`, as described on the [Odoo Apps upload page](https://apps.odoo.com/apps/upload). The repository has not been registered or submitted to Odoo Apps.

For a later module update on that test database:

```sh
./odoo-bin -c /path/to/odoo.conf -d <test_database> -u ff_pos_bluetooth_printer --stop-after-init
```

These commands are standard examples, not verified against the user's server layout. The Odoo source tree used for inspection is not treated as the user's production runtime.

## Rollout sequence

1. Back up the target database and filestore using the site's normal backup procedure.
2. Install in a copy/staging database first; validate view loading and POS assets.
3. Add verified UUIDs only after discovering them from manufacturer documentation or a BLE inspection tool.
4. Keep Bluetooth disabled or use Manual mode with native fallback for the first live installation.
5. Test on a dedicated POS session and a physical printer following `HARDWARE_TEST_PLAN.md`.
6. Upgrade production only after staging and hardware acceptance; plan a maintenance window for the Odoo service restart needed to load Python changes.

## Rollback

Disable Bluetooth printing for the POS and restore the original/native Odoo printer workflow. If removing the addon is necessary, back up first, uninstall via Odoo Apps or the controlled Odoo CLI on a maintenance copy, and verify no other addon depends on it. No database uninstall was executed as part of this work.

## Browser and network

Use HTTPS. Web Bluetooth availability is determined by the actual browser and operating system; do not assume iOS Safari or Chrome iOS supports it. Bluefy's behavior must be measured on the target iPhone. The BLE pairing/permission prompt must be initiated from a cashier click.
