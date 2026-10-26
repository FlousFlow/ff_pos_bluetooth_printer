import { Component, useState, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { Navbar } from "@point_of_sale/app/components/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { BluetoothDiagnosticWizard } from "./diagnostic_wizard";

export class BluetoothPrinterStatus extends Component {
    static template = "ff_pos_bluetooth_printer.BluetoothPrinterStatus";
    setup() {
        this.pos = useService("pos");
        this.bluetooth = useService("ff_bluetooth_printer");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
        this.state = useState({ status: this.bluetooth.status(), busy: false });
        this.listener = (status) => { this.state.status = status; };
        this.bluetooth.transport.onState = this.listener;
        onWillUnmount(() => { this.bluetooth.transport.onState = () => {}; });
    }
    get enabled() { return this.pos.config.ff_bluetooth_enabled; }
    get diagnosticsEnabled() { return this.enabled && this.pos.config.ff_diagnostic_mode; }
    get label() { return this.state.status === "READY" ? _t("Printer Ready") : _t("Bluetooth Printer"); }
    toggleConnection() {
        if (this.state.status === "READY") this.disconnect();
        else this.connect();
    }
    async connect() {
        this.state.busy = true;
        try {
            if (this.bluetooth.transport.device) await this.bluetooth.reconnect(this.pos);
            else await this.bluetooth.connect(this.pos);
        }
        catch (error) { this.notification.add(_t("Printer connection failed. Check the configured UUIDs and browser permissions."), { type: "warning" }); }
        finally { this.state.busy = false; }
    }
    disconnect() { this.bluetooth.disconnect(); }
    async testPrint() {
        try {
            await this.bluetooth.testPrint(this.pos);
            this.notification.add(_t("Test data sent. Confirm the paper output at the printer."), { type: "info" });
        } catch (error) {
            this.notification.add(_t("Test print failed. Check the connection and profile."), { type: "warning" });
        }
    }
    openDiagnostics() {
        this.dialog.add(BluetoothDiagnosticWizard, { pos: this.pos, bluetooth: this.bluetooth });
    }
}

patch(Navbar, {
    components: { ...Navbar.components, BluetoothPrinterStatus },
});
