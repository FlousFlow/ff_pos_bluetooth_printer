/** Browser-side BLE transport. It deliberately knows nothing about receipts or printer commands. */
export const BLE_STATES = Object.freeze({
    UNSUPPORTED: "UNSUPPORTED",
    NOT_CONFIGURED: "NOT_CONFIGURED",
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    READY: "READY",
    SENDING: "SENDING",
    ERROR: "ERROR",
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class BleTransport {
    constructor({ bluetooth = globalThis.navigator?.bluetooth, secureContext = globalThis.isSecureContext } = {}) {
        this.bluetooth = bluetooth;
        this.secureContext = secureContext;
        this.state = BLE_STATES.DISCONNECTED;
        this.device = null;
        this.server = null;
        this.characteristic = null;
        this.profile = null;
        this.onState = () => {};
        this.onDisconnected = () => {};
        this.disconnectionHandler = () => {
            this.server = null;
            this.characteristic = null;
            this._setState(BLE_STATES.DISCONNECTED);
            this.onDisconnected();
        };
    }

    _setState(state) {
        this.state = state;
        this.onState(state);
    }

    support() {
        if (!this.secureContext) return { supported: false, state: BLE_STATES.UNSUPPORTED, reason: "secure_context_required" };
        if (!this.bluetooth?.requestDevice) return { supported: false, state: BLE_STATES.UNSUPPORTED, reason: "web_bluetooth_unavailable" };
        return { supported: true, state: this.state, reason: null };
    }

    validateProfile(profile) {
        if (!profile?.service_uuid || !profile?.write_characteristic_uuid || profile.protocol === "unset" || !Number.isInteger(profile.printable_width_dots) || profile.printable_width_dots < 1) {
            return { valid: false, reason: "profile_incomplete" };
        }
        if (profile.protocol !== "escpos_raster") return { valid: false, reason: "protocol_not_implemented" };
        return { valid: true };
    }

    async requestDevice(profile, timeoutMs = 20000) {
        const support = this.support();
        if (!support.supported) {
            this._setState(BLE_STATES.UNSUPPORTED);
            throw new Error(support.reason);
        }
        const validation = this.validateProfile(profile);
        if (!validation.valid) {
            this._setState(BLE_STATES.NOT_CONFIGURED);
            throw new Error(validation.reason);
        }
        this.profile = profile;
        this._setState(BLE_STATES.CONNECTING);
        try {
            // User must call this from a user-initiated event. UUID authorization is explicit.
            this.device = await this.bluetooth.requestDevice({
                filters: [{ services: [profile.service_uuid] }],
                optionalServices: [profile.service_uuid],
            });
            this.device.addEventListener("gattserverdisconnected", this.disconnectionHandler);
            return await this.connect(profile, timeoutMs);
        } catch (error) {
            this._setState(BLE_STATES.ERROR);
            throw error;
        }
    }

    async connect(profile = this.profile, timeoutMs = 20000) {
        const validation = this.validateProfile(profile);
        if (!validation.valid) throw new Error(validation.reason);
        if (!this.device) throw new Error("device_not_selected");
        this.profile = profile;
        this._setState(BLE_STATES.CONNECTING);
        try {
            this.server = await this._withTimeout(this.device.gatt.connect(), timeoutMs, "connection_timeout");
            this._setState(BLE_STATES.CONNECTED);
            const service = await this.server.getPrimaryService(profile.service_uuid);
            this.characteristic = await service.getCharacteristic(profile.write_characteristic_uuid);
            if (!this.characteristic.properties?.write && !this.characteristic.properties?.writeWithoutResponse) {
                throw new Error("characteristic_not_writable");
            }
            this._setState(BLE_STATES.READY);
            return { deviceName: this.device.name || "Bluetooth printer", canWrite: true };
        } catch (error) {
            this.characteristic = null;
            this._setState(BLE_STATES.ERROR);
            throw error;
        }
    }

    async send(bytes, { chunkSize = 180, delayMs = 20, timeoutMs = 10000 } = {}) {
        if (this.state !== BLE_STATES.READY || !this.characteristic) throw new Error("printer_not_ready");
        if (!(bytes instanceof Uint8Array) || !bytes.length) throw new Error("invalid_payload");
        if (!Number.isInteger(chunkSize) || chunkSize < 20 || chunkSize > 512) throw new Error("invalid_chunk_size");
        this._setState(BLE_STATES.SENDING);
        let written = 0;
        try {
            for (let offset = 0; offset < bytes.length; offset += chunkSize) {
                const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
                const write = this.characteristic.properties.write && this.characteristic.writeValueWithResponse
                    ? this.characteristic.writeValueWithResponse(chunk)
                    : this.characteristic.properties.writeWithoutResponse && this.characteristic.writeValueWithoutResponse
                        ? this.characteristic.writeValueWithoutResponse(chunk)
                        : null;
                if (!write) throw new Error("write_method_unavailable");
                await this._withTimeout(write, timeoutMs, "write_timeout");
                written += chunk.length;
                if (offset + chunk.length < bytes.length && delayMs) await delay(delayMs);
            }
            this._setState(BLE_STATES.READY);
            return { bytesWritten: written, transmittedUnconfirmed: true };
        } catch (error) {
            this._setState(BLE_STATES.ERROR);
            error.bytesWritten = written;
            // A failed GATT write may have reached the device even without confirmation.
            error.transmissionUncertain = true;
            throw error;
        }
    }

    disconnect() {
        try {
            if (this.device) this.device.removeEventListener("gattserverdisconnected", this.disconnectionHandler);
            if (this.device?.gatt?.connected) this.device.gatt.disconnect();
        } finally {
            this.server = null;
            this.characteristic = null;
            this.device = null;
            this._setState(BLE_STATES.DISCONNECTED);
        }
    }

    _withTimeout(promise, timeoutMs, code) {
        let timer;
        return Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(code)), timeoutMs); }),
        ]).finally(() => clearTimeout(timer));
    }

    diagnostic() {
        return {
            state: this.state,
            secureContext: Boolean(this.secureContext),
            webBluetoothAvailable: Boolean(this.bluetooth?.requestDevice),
            deviceSelected: Boolean(this.device),
            gattConnected: Boolean(this.device?.gatt?.connected),
            profileConfigured: Boolean(this.profile?.service_uuid && this.profile?.write_characteristic_uuid),
            protocol: this.profile?.protocol || null,
            // Do not include receipts, customer data, UUIDs, or browser permission tokens.
        };
    }
}
