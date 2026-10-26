import re

from odoo import api, fields, models
from odoo.exceptions import ValidationError

UUID_PATTERN = re.compile(r"^(?:[0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{32}|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})$")


class FfPosPrinterProfile(models.Model):
    _name = "ff.pos.printer.profile"
    _description = "POS Bluetooth Printer Profile"
    _order = "name"
    _check_company_auto = True

    name = fields.Char(required=True, translate=True, string="Profile Name")
    manufacturer = fields.Char(string="Manufacturer")
    model_name = fields.Char(string="Model")
    company_id = fields.Many2one("res.company", required=True, default=lambda self: self.env.company, index=True, string="Company")
    active = fields.Boolean(default=True, string="Active")
    verification_status = fields.Selection(
        [("incomplete", "Requires Configuration"), ("experimental", "Experimental / Not Hardware Verified"), ("verified", "Hardware Verified")],
        required=True, default="incomplete", string="Verification Status",
    )
    service_uuid = fields.Char(string="GATT Service UUID", help="Must come from the manufacturer or BLE inspection; never guess this value.")
    write_characteristic_uuid = fields.Char(string="Write Characteristic UUID")
    notification_characteristic_uuid = fields.Char(string="Notification Characteristic UUID")
    protocol = fields.Selection(
        [("unset", "Not Selected"), ("escpos_raster", "ESC/POS Raster (Explicit Compatibility Gate)"), ("custom", "Custom / Not Implemented")],
        required=True, default="unset", string="Protocol",
    )
    paper_width_mm = fields.Float(string="Paper Width (mm)")
    printable_width_dots = fields.Integer(string="Effective Printable Width (dots)")
    resolution_dpi = fields.Integer(string="Print Resolution (dpi)")
    chunk_size = fields.Integer(default=20, string="BLE Chunk Size (bytes)")
    inter_chunk_delay_ms = fields.Integer(default=20, string="Inter-chunk Delay (ms)")
    notes = fields.Text(string="Known Limitations and Notes")
    verified_capabilities = fields.Text(string="Verified Capabilities", help="Only record capabilities confirmed on this exact printer/firmware.")
    verification_evidence = fields.Text(string="Hardware Verification Evidence")

    @api.constrains("service_uuid", "write_characteristic_uuid", "notification_characteristic_uuid")
    def _check_uuids(self):
        for record in self:
            for value in (record.service_uuid, record.write_characteristic_uuid, record.notification_characteristic_uuid):
                if value and not UUID_PATTERN.fullmatch(value):
                    raise ValidationError(self.env._("Enter a valid 16-bit, 32-bit, or 128-bit Bluetooth UUID."))

    @api.constrains("chunk_size", "inter_chunk_delay_ms", "printable_width_dots", "resolution_dpi", "paper_width_mm")
    def _check_transport_limits(self):
        for record in self:
            if not 20 <= record.chunk_size <= 512:
                raise ValidationError(self.env._("Chunk size must be between 20 and 512 bytes."))
            if not 0 <= record.inter_chunk_delay_ms <= 1000:
                raise ValidationError(self.env._("Inter-chunk delay must be between 0 and 1000 ms."))
            if any((record.printable_width_dots and not 1 <= record.printable_width_dots <= 2048,
                    record.resolution_dpi and not 1 <= record.resolution_dpi <= 1200,
                    record.paper_width_mm and not 1 <= record.paper_width_mm <= 300)):
                raise ValidationError(self.env._("Printer paper dimensions and resolution are outside supported configuration limits."))

    @api.constrains("verification_status", "service_uuid", "write_characteristic_uuid", "protocol", "printable_width_dots", "verification_evidence")
    def _check_verified_profile(self):
        for record in self:
            if record.verification_status == "verified" and (not record.service_uuid or not record.write_characteristic_uuid or record.protocol != "escpos_raster" or not record.printable_width_dots or not record.verification_evidence):
                raise ValidationError(self.env._("A verified profile requires confirmed GATT UUIDs, raster protocol, printable width, and hardware evidence."))
