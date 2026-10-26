# GitHub release record

- Repository: https://github.com/FlousFlow/ff_pos_bluetooth_printer
- Release branch: `19.0` (Odoo 19 version branch)
- Module: `ff_pos_bluetooth_printer`
- Manifest version: `19.0.1.0.0`
- Repository visibility: public, standalone, addon root at repository root
- Odoo Apps status: source branch prepared; repository registration, vendor upload, review, and publication have not been performed.

The `19.0` branch is the version ref for Odoo 19. Odoo Apps describes repository refs in the form `<repository>#<version>` on its [upload page](https://apps.odoo.com/apps/upload). The source repo can therefore be registered with the `19.0` ref after completing the remaining listing requirements.

## Release verification

The same addon source was installed and upgraded on the local Odoo Community 19 lab database `ff_lab_odoo19`. Eleven Odoo test cases and twelve mocked JavaScript tests passed. The POS debug asset endpoint returned HTTP 200 and included the addon modules and OWL template. These checks do not verify a browser POS session, Bluefy behavior, BLE hardware, or physical paper output.
