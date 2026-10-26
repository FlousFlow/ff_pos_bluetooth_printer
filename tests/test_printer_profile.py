from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestBluetoothPrinterProfile(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Profile = cls.env["ff.pos.printer.profile"]

    def _profile(self, **values):
        defaults = {"name": "BLE test profile", "company_id": self.env.company.id}
        defaults.update(values)
        return self.Profile.create(defaults)

    def test_seed_profiles_are_incomplete_and_experimental(self):
        rpp30 = self.env.ref("ff_pos_bluetooth_printer.profile_rongta_rpp30")
        generic = self.env.ref("ff_pos_bluetooth_printer.profile_generic_ble")
        self.assertEqual(rpp30.verification_status, "experimental")
        self.assertFalse(rpp30.service_uuid)
        self.assertEqual(rpp30.protocol, "unset")
        self.assertEqual(rpp30.paper_width_mm, 72)
        self.assertFalse(generic.service_uuid)
        self.assertEqual(generic.verification_status, "incomplete")

    def test_uuid_format_validation(self):
        for value in ("180f", "12345678", "12345678-1234-5678-9abc-def012345678", "a" * 32):
            with self.subTest(value=value):
                record = self._profile(service_uuid=value)
                self.assertEqual(record.service_uuid, value)
                record.unlink()
        with self.assertRaises(ValidationError):
            self._profile(service_uuid="not-a-uuid")

    def test_transport_bounds(self):
        for values in (
            {"chunk_size": 19}, {"chunk_size": 513},
            {"inter_chunk_delay_ms": -1}, {"inter_chunk_delay_ms": 1001},
            {"printable_width_dots": 2049}, {"resolution_dpi": 1201},
            {"paper_width_mm": 301},
        ):
            with self.subTest(values=values), self.assertRaises(ValidationError):
                self._profile(**values)


    def test_pos_fields_are_loaded_and_defaults_are_safe(self):
        config = self.env["pos.config"].new({"company_id": self.env.company.id})
        field_names = config._load_pos_data_fields(config)
        for field_name in (
            "ff_bluetooth_enabled", "ff_printer_profile_id", "ff_print_mode", "ff_connection_behavior",
            "ff_ble_connection_timeout", "ff_ble_write_timeout", "ff_native_fallback", "ff_rendering_mode",
        ):
            self.assertIn(field_name, field_names)
        self.assertFalse(config.ff_bluetooth_enabled)
        self.assertEqual(config.ff_print_mode, "manual")
        self.assertTrue(config.ff_native_fallback)

    def test_profile_model_is_loaded_only_when_bluetooth_is_enabled(self):
        Session = self.env["pos.session"]
        config = self.env["pos.config"].new({"company_id": self.env.company.id, "ff_bluetooth_enabled": False})
        self.assertNotIn("ff.pos.printer.profile", Session._load_pos_data_models(config))
        config.ff_bluetooth_enabled = True
        self.assertIn("ff.pos.printer.profile", Session._load_pos_data_models(config))

    def test_pos_profile_domain_and_data_fields_are_scoped(self):
        other_company = self.env["res.company"].create({"name": "BLE Domain Other Company"})
        profile = self._profile(company_id=other_company.id)
        config = self.env["pos.config"].new({
            "company_id": self.env.company.id, "ff_printer_profile_id": profile.id,
        })
        domain = self.Profile._load_pos_data_domain([], config)
        self.assertEqual(domain, [("id", "=", profile.id), ("company_id", "=", self.env.company.id)])
        fields = self.Profile._load_pos_data_fields(config)
        self.assertIn("service_uuid", fields)
        self.assertIn("write_characteristic_uuid", fields)
        self.assertNotIn("verification_evidence", fields)

    def test_verified_profile_requires_hardware_evidence_and_parameters(self):
        with self.assertRaises(ValidationError):
            self._profile(verification_status="verified")
        record = self._profile(
            verification_status="verified", service_uuid="180f", write_characteristic_uuid="2af1",
            protocol="escpos_raster", printable_width_dots=576, verification_evidence="Bench-tested exact firmware",
        )
        self.assertEqual(record.verification_status, "verified")

    def test_invalid_timeout_bounds(self):
        Config = self.env["pos.config"]
        for values in ({"ff_ble_connection_timeout": 0}, {"ff_ble_write_timeout": 61}):
            with self.subTest(values=values), self.assertRaises(ValidationError):
                Config.new(values)._check_ff_timeouts()

    def test_profile_must_match_pos_company(self):
        other_company = self.env["res.company"].create({"name": "Bluetooth Other Company"})
        profile = self._profile(company_id=other_company.id)
        config = self.env["pos.config"].new({
            "company_id": self.env.company.id, "ff_bluetooth_enabled": True, "ff_printer_profile_id": profile.id,
        })
        with self.assertRaises(ValidationError):
            config._check_ff_profile_company()

    def test_cashier_can_read_but_not_change_profiles(self):
        profile = self._profile()
        cashier = self.env.ref("point_of_sale.group_pos_user")
        user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "BLE cashier", "login": "ble-cashier-test", "company_id": self.env.company.id,
            "company_ids": [(6, 0, [self.env.company.id])], "group_ids": [(6, 0, [self.env.ref("base.group_user").id, cashier.id])],
        })
        record = self.Profile.with_user(user).browse(profile.id)
        self.assertEqual(record.name, profile.name)
        with self.assertRaises(AccessError):
            record.write({"name": "Changed by cashier"})

    def test_profile_company_rule_hides_other_company_records(self):
        other_company = self.env["res.company"].create({"name": "BLE Rule Other Company"})
        other_profile = self._profile(company_id=other_company.id)
        cashier_group = self.env.ref("point_of_sale.group_pos_user")
        user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "BLE limited cashier", "login": "ble-limited-cashier-test", "company_id": self.env.company.id,
            "company_ids": [(6, 0, [self.env.company.id])], "group_ids": [(6, 0, [self.env.ref("base.group_user").id, cashier_group.id])],
        })
        self.assertFalse(self.Profile.with_user(user).search([("id", "=", other_profile.id)]))
