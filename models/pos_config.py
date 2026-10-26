from odoo import api, fields, models
from odoo.exceptions import ValidationError


class PosConfig(models.Model):
    _inherit = "pos.config"

    ff_bluetooth_enabled = fields.Boolean(string="Enable Bluetooth Receipt Printing")
    ff_printer_profile_id = fields.Many2one(
        "ff.pos.printer.profile", string="Bluetooth Printer Profile", check_company=True,
        domain="[('active', '=', True), ('company_id', '=', company_id)]",
    )
    ff_print_mode = fields.Selection(
        [("manual", "Manual"), ("automatic", "Automatic")], string="Bluetooth Printing Mode", default="manual",
    )
    ff_connection_behavior = fields.Selection(
        [("on_demand", "Connect on Cashier Request"), ("reconnect", "Reconnect After a Known Disconnect")],
        string="Default Printer Connection Behavior", default="on_demand",
    )
    ff_ble_connection_timeout = fields.Integer(string="BLE Connection Timeout (seconds)", default=20)
    ff_ble_write_timeout = fields.Integer(string="BLE Write Timeout (seconds)", default=10)
    ff_diagnostic_mode = fields.Boolean(string="Bluetooth Diagnostic Mode")
    ff_native_fallback = fields.Boolean(string="Use Native Printer Fallback", default=True)
    ff_rendering_mode = fields.Selection(
        [("raster", "Rasterize Odoo Receipt"), ("disabled", "Disabled")], string="Rendering Mode", default="raster",
    )

    @api.constrains("ff_ble_connection_timeout", "ff_ble_write_timeout")
    def _check_ff_timeouts(self):
        for config in self:
            if not 1 <= config.ff_ble_connection_timeout <= 120 or not 1 <= config.ff_ble_write_timeout <= 60:
                raise ValidationError(self.env._("Bluetooth timeouts are outside the supported range."))

    @api.constrains("ff_bluetooth_enabled", "ff_printer_profile_id")
    def _check_ff_profile_company(self):
        for config in self:
            if config.ff_bluetooth_enabled and config.ff_printer_profile_id and config.ff_printer_profile_id.company_id != config.company_id:
                raise ValidationError(self.env._("The Bluetooth printer profile must belong to the same company as this point of sale."))

    @api.model
    def _load_pos_data_fields(self, config):
        return super()._load_pos_data_fields(config) + [
            "ff_bluetooth_enabled", "ff_printer_profile_id", "ff_print_mode", "ff_connection_behavior",
            "ff_ble_connection_timeout", "ff_ble_write_timeout", "ff_diagnostic_mode",
            "ff_native_fallback", "ff_rendering_mode",
        ]


class PosSession(models.Model):
    _inherit = "pos.session"

    @api.model
    def _load_pos_data_models(self, config):
        models_to_load = super()._load_pos_data_models(config)
        if config.ff_bluetooth_enabled and "ff.pos.printer.profile" not in models_to_load:
            models_to_load.append("ff.pos.printer.profile")
        return models_to_load


class FfPosPrinterProfile(models.Model):
    _inherit = "ff.pos.printer.profile"

    @api.model
    def _load_pos_data_domain(self, data, config):
        return [("id", "=", config.ff_printer_profile_id.id), ("company_id", "=", config.company_id.id)]

    @api.model
    def _load_pos_data_fields(self, config):
        return [
            "id", "name", "manufacturer", "model_name", "verification_status", "service_uuid",
            "write_characteristic_uuid", "notification_characteristic_uuid", "protocol", "printable_width_dots",
            "chunk_size", "inter_chunk_delay_ms",
        ]
