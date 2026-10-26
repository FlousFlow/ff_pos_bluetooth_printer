import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

export class BluetoothDiagnosticWizard extends Component {
    static template = "ff_pos_bluetooth_printer.BluetoothDiagnosticWizard";
    static components = { Dialog };
    static props = { pos: Object, bluetooth: Object, close: Function };

    setup() {
        this.notification = useService("notification");
        this.state = useState({ step: 1, busy: false, error: false, transmissionComplete: false, confirmation: null });
    }

    get title() { return _t("Bluetooth Printer Diagnostics"); }
    get browserSupported() { return this.props.bluetooth.transport.support().supported; }
    get connected() { return this.props.bluetooth.status() === "READY"; }

    nextStep() { this.state.step += 1; }

    async selectAndConnect() {
        this.state.busy = true;
        this.state.error = false;
        try {
            await this.props.bluetooth.connect(this.props.pos);
            this.state.step = 3;
        } catch {
            this.state.error = true;
        } finally {
            this.state.busy = false;
        }
    }

    async sendTestPage() {
        this.state.busy = true;
        this.state.error = false;
        try {
            await this.props.bluetooth.testPrint(this.props.pos);
            this.state.transmissionComplete = true;
            this.state.step = 6;
        } catch {
            this.state.error = true;
        } finally {
            this.state.busy = false;
        }
    }

    async copyDiagnosticReport() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(this.props.bluetooth.diagnostic(), null, 2));
            this.notification.add(_t("Diagnostic report copied."), { type: "info" });
        } catch {
            this.notification.add(_t("Could not copy the diagnostic report."), { type: "warning" });
        }
    }

    confirmPaperOutput(printed) { this.state.confirmation = printed; }
}
