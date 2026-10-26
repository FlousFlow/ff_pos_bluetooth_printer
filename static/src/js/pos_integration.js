import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { PosConfig } from "@point_of_sale/app/models/pos_config";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";
import { htmlToCanvas } from "@point_of_sale/app/services/render_service";
import { waitImages } from "@point_of_sale/utils";
import { BleTransport, BLE_STATES } from "./ble_transport";
import { encodeEscPosRaster } from "./escpos_raster";
import { PrintCoordinator } from "./print_coordinator";

const bluetoothPrinterService = {
    dependencies: ["renderer", "notification"],
    start(env, { renderer, notification }) {
        const transport = new BleTransport();
        const coordinator = new PrintCoordinator();
        let automaticOrderUuid = null;
        let activePos = null;
        const profileFor = (pos) => {
            const configured = pos.config.ff_printer_profile_id;
            const id = configured?.id || configured;
            const record = configured?.raw || pos.models["ff.pos.printer.profile"]?.get(id);
            return record?.raw || record || null;
        };
        transport.onDisconnected = () => {
            if (activePos?.config.ff_connection_behavior === "reconnect" && transport.device) {
                const profile = profileFor(activePos);
                window.setTimeout(() => {
                    transport.connect(profile, activePos.config.ff_ble_connection_timeout * 1000).catch(() => {});
                }, 250);
            }
        };
        return {
            transport,
            status: () => transport.state,
            async connect(pos) {
                activePos = pos;
                const profile = profileFor(pos);
                const profileCheck = transport.validateProfile(profile);
                if (!profileCheck.valid) throw new Error(profileCheck.reason);
                return transport.requestDevice(profile, pos.config.ff_ble_connection_timeout * 1000);
            },
            async reconnect(pos) {
                activePos = pos;
                const profile = profileFor(pos);
                if (!transport.device) return this.connect(pos);
                return transport.connect(profile, pos.config.ff_ble_connection_timeout * 1000);
            },
            async testPrint(pos) {
                activePos = pos;
                const profile = profileFor(pos);
                if (transport.state !== BLE_STATES.READY) throw new Error("printer_not_ready");
                const canvas = document.createElement("canvas");
                canvas.width = profile.printable_width_dots;
                canvas.height = 160;
                const context = canvas.getContext("2d");
                if (!context) throw new Error("canvas_unavailable");
                context.fillStyle = "#fff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = "#000";
                context.font = "24px sans-serif";
                const rtl = document.documentElement.dir === "rtl";
                context.direction = rtl ? "rtl" : "ltr";
                context.textAlign = rtl ? "right" : "left";
                const textX = rtl ? canvas.width - 12 : 12;
                context.fillText(_t("Flous Flow BLE Test"), textX, 42);
                context.font = "16px sans-serif";
                context.fillText(new Date().toISOString(), textX, 78);
                context.fillText(_t("Output is unconfirmed until checked"), textX, 112);
                const payload = encodeEscPosRaster(canvas, { widthDots: profile.printable_width_dots });
                return transport.send(payload, {
                    chunkSize: profile.chunk_size,
                    delayMs: profile.inter_chunk_delay_ms,
                    timeoutMs: pos.config.ff_ble_write_timeout * 1000,
                });
            },
            disconnect() { transport.disconnect(); },
            markAutomaticOrder(uuid) { automaticOrderUuid = uuid; },
            async printReceipt(pos, { order, basic = false }) {
                activePos = pos;
                const profile = profileFor(pos);
                const auto = automaticOrderUuid === order.uuid;
                if (auto) automaticOrderUuid = null;
                if (pos.config.ff_rendering_mode !== "raster") return { attempted: false, reason: "rendering_disabled" };
                if (transport.state !== BLE_STATES.READY && !auto) {
                    try { await this.connect(pos); } catch (error) { return { attempted: false, reason: error.message }; }
                }
                if (transport.state !== BLE_STATES.READY) return { attempted: false, reason: "printer_not_ready" };
                const check = transport.validateProfile(profile);
                if (!check.valid) return { attempted: false, reason: check.reason };
                const result = await coordinator.enqueue({
                    orderKey: order.uuid,
                    automatic: auto,
                    prepare: async () => {
                        const el = await renderer.toHtml(OrderReceipt, { order, basic_receipt: basic });
                        await waitImages(el);
                        const canvas = await htmlToCanvas(el, { addClass: "pos-receipt-print" });
                        return encodeEscPosRaster(canvas, { widthDots: profile.printable_width_dots });
                    },
                    send: (payload) => transport.send(payload, {
                        chunkSize: profile.chunk_size,
                        delayMs: profile.inter_chunk_delay_ms,
                        timeoutMs: pos.config.ff_ble_write_timeout * 1000,
                    }),
                });
                if (result.duplicate) return { attempted: true, successful: true, duplicate: true };
                if (result.error) {
                    notification.add(_t("Bluetooth receipt transmission failed. Check printer status before retrying."), { type: "warning" });
                    return { attempted: true, successful: false, uncertain: result.state === "UNKNOWN_AFTER_DISCONNECT" };
                }
                notification.add(_t("Receipt data transmitted; paper output is not confirmed."), { type: "info" });
                return { attempted: true, successful: true, unconfirmed: true };
            },
            diagnostic() { return transport.diagnostic(); },
        };
    },
};
registry.category("services").add("ff_bluetooth_printer", bluetoothPrinterService);

// PrintReceipt remains the sole routing point. The original PosStore implementation handles
// native printing whenever Bluetooth is disabled, unconfigured, or explicitly falls back.
patch(PosStore.prototype, {
    async printReceipt(options = {}) {
        const config = this.config;
        if (!config.ff_bluetooth_enabled) {
            return super.printReceipt(...arguments);
        }
        const service = this.env.services.ff_bluetooth_printer;
        const result = await service.printReceipt(this, options);
        if (!result.attempted) {
            if (config.ff_native_fallback) return super.printReceipt(...arguments);
            this.notification.add(_t("Bluetooth printer is not ready. Use the configured native printer or connect Bluetooth first."), { type: "warning" });
            return false;
        }
        if (!result.successful && config.ff_native_fallback && !result.uncertain) {
            return super.printReceipt(...arguments);
        }
        if (result.successful && !result.duplicate && !options.printBillActionTriggered) {
            const order = options.order || this.getOrder();
            const count = order.nb_print ? order.nb_print + 1 : 1;
            if (order.isSynced) {
                const wasDirty = order.isDirty();
                await this.data.write("pos.order", [order.id], { nb_print: count });
                if (!wasDirty) order._dirty = false;
            }
            else order.nb_print = count;
        }
        return result.successful ? { successful: true, unconfirmed: true } : false;
    },
});

// Existing Odoo automatic printing invokes PosStore.printReceipt after the order is validated.
// This marker distinguishes that one call from a cashier's deliberate reprint.
import OrderPaymentValidation from "@point_of_sale/app/utils/order_payment_validation";
patch(OrderPaymentValidation.prototype, {
    async afterOrderValidation() {
        if (this.pos.config.ff_bluetooth_enabled && this.pos.config.ff_print_mode === "automatic" && this.canPrintReceipt) {
            this.pos._ffAutoPrintPending = this.order.uuid;
            this.pos.env.services.ff_bluetooth_printer.markAutomaticOrder(this.order.uuid);
        }
        return super.afterOrderValidation(...arguments);
    },
});

patch(PosConfig.prototype, {
    get autoPrint() {
        return super.autoPrint || (this.ff_bluetooth_enabled && this.ff_print_mode === "automatic");
    },
});
