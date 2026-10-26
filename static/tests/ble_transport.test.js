import test from "node:test";
import assert from "node:assert/strict";
import { BleTransport, BLE_STATES } from "../src/js/ble_transport.js";
import { PrintCoordinator, JOB_STATES } from "../src/js/print_coordinator.js";
import { encodeEscPosRaster } from "../src/js/escpos_raster.js";

const profile = {
    service_uuid: "000018f0-0000-1000-8000-00805f9b34fb",
    write_characteristic_uuid: "00002af1-0000-1000-8000-00805f9b34fb",
    protocol: "escpos_raster",
    printable_width_dots: 576,
    chunk_size: 20,
};

function fakeDevice({ connect = async () => {}, service = undefined, properties = { write: true } } = {}) {
    const writes = [];
    const characteristic = {
        properties,
        async writeValueWithResponse(bytes) { writes.push([...bytes]); },
        async writeValueWithoutResponse(bytes) { writes.push([...bytes]); },
    };
    const fakeService = service === undefined ? { async getCharacteristic() { return characteristic; } } : service;
    const device = {
        name: "Mock BLE Printer",
        gatt: {
            connected: false,
            async connect() {
                await connect();
                device.gatt.connected = true;
                return {
                    async getPrimaryService(uuid) {
                        assert.equal(uuid, profile.service_uuid);
                        if (fakeService === null) throw new Error("service_missing");
                        return fakeService;
                    },
                };
            },
            disconnect() { device.gatt.connected = false; device.onDisconnect?.(); },
        },
        handlers: new Set(),
        addEventListener(_name, handler) { this.handlers.add(handler); this.onDisconnect = handler; },
        removeEventListener(_name, handler) { this.handlers.delete(handler); },
    };
    return { device, writes, characteristic };
}

test("rejects insecure and unsupported browser contexts", () => {
    const insecure = new BleTransport({ bluetooth: { requestDevice() {} }, secureContext: false });
    assert.equal(insecure.support().reason, "secure_context_required");
    const unsupported = new BleTransport({ bluetooth: null, secureContext: true });
    assert.equal(unsupported.support().state, BLE_STATES.UNSUPPORTED);
});

test("blocks incomplete profile and unapproved protocol", () => {
    const transport = new BleTransport({ bluetooth: { requestDevice() {} }, secureContext: true });
    assert.equal(transport.validateProfile({}).valid, false);
    assert.equal(transport.validateProfile({ ...profile, protocol: "unset" }).valid, false);
});

test("connects only to the authorized service and validates writable characteristic", async () => {
    const { device } = fakeDevice();
    const transport = new BleTransport({ bluetooth: { async requestDevice(options) {
        assert.deepEqual(options.filters[0].services, [profile.service_uuid]);
        assert.deepEqual(options.optionalServices, [profile.service_uuid]);
        return device;
    } }, secureContext: true });
    await transport.requestDevice(profile);
    assert.equal(transport.state, BLE_STATES.READY);
    assert.equal(transport.diagnostic().deviceSelected, true);

    const { device: badDevice } = fakeDevice({ service: { async getCharacteristic() { return { properties: {} }; } } });
    const bad = new BleTransport({ bluetooth: { async requestDevice() { return badDevice; } }, secureContext: true });
    await assert.rejects(bad.requestDevice(profile), /characteristic_not_writable/);
    assert.equal(bad.state, BLE_STATES.ERROR);
});

test("reports chooser cancellation, connection failure, absent service, and write timeout", async () => {
    const cancelled = new BleTransport({ bluetooth: { async requestDevice() { throw new Error("NotFoundError"); } }, secureContext: true });
    await assert.rejects(cancelled.requestDevice(profile), /NotFoundError/);
    assert.equal(cancelled.state, BLE_STATES.ERROR);

    const failedConnection = fakeDevice({ connect: async () => { throw new Error("connection_failed"); } });
    const broken = new BleTransport({ bluetooth: { async requestDevice() { return failedConnection.device; } }, secureContext: true });
    await assert.rejects(broken.requestDevice(profile), /connection_failed/);

    const absent = fakeDevice({ service: null });
    const noService = new BleTransport({ bluetooth: { async requestDevice() { return absent.device; } }, secureContext: true });
    await assert.rejects(noService.requestDevice(profile), /service_missing/);

    const hanging = fakeDevice({ connect: () => new Promise(() => {}) });
    const timeout = new BleTransport({ bluetooth: { async requestDevice() { return hanging.device; } }, secureContext: true });
    await assert.rejects(timeout.requestDevice(profile, 5), /connection_timeout/);
});

test("chunks binary payload in order and does not retry a failed transfer", async () => {
    const { device, writes } = fakeDevice();
    const transport = new BleTransport({ bluetooth: { async requestDevice() { return device; } }, secureContext: true });
    await transport.requestDevice(profile);
    const result = await transport.send(new Uint8Array(45).map((_, i) => i), { chunkSize: 20, delayMs: 0 });
    assert.deepEqual(writes.map((chunk) => chunk.length), [20, 20, 5]);
    assert.equal(result.bytesWritten, 45);
    assert.equal(transport.state, BLE_STATES.READY);
    await transport.send(new Uint8Array([9, 8]), { chunkSize: 20, delayMs: 0 });
    assert.equal(writes.at(-1).length, 2);

    let calls = 0;
    transport.characteristic.writeValueWithResponse = async () => { calls += 1; if (calls === 2) throw new Error("link_lost"); };
    await assert.rejects(transport.send(new Uint8Array(50), { chunkSize: 20, delayMs: 0 }), (error) => error.transmissionUncertain);
    assert.equal(calls, 2);
});

test("marks write timeouts uncertain and rejects missing write methods", async () => {
    const { device } = fakeDevice();
    const transport = new BleTransport({ bluetooth: { async requestDevice() { return device; } }, secureContext: true });
    await transport.requestDevice(profile);
    transport.characteristic.writeValueWithResponse = () => new Promise(() => {});
    await assert.rejects(transport.send(new Uint8Array([1]), { timeoutMs: 5 }), (error) => error.transmissionUncertain && /write_timeout/.test(error.message));

    const noWrite = fakeDevice({ properties: { write: true } });
    delete noWrite.characteristic.writeValueWithResponse;
    const noWriteTransport = new BleTransport({ bluetooth: { async requestDevice() { return noWrite.device; } }, secureContext: true });
    await noWriteTransport.requestDevice(profile);
    await assert.rejects(noWriteTransport.send(new Uint8Array([1])), /write_method_unavailable/);
});

test("disconnect clears GATT handles and manual reconnect requires an existing device", async () => {
    const { device } = fakeDevice();
    const transport = new BleTransport({ bluetooth: { async requestDevice() { return device; } }, secureContext: true });
    await transport.requestDevice(profile);
    transport.disconnect();
    assert.equal(transport.state, BLE_STATES.DISCONNECTED);
    assert.equal(transport.characteristic, null);
    await assert.rejects(transport.connect(profile), /device_not_selected/);
});

test("reconnects manually after an observed GATT disconnection without selecting a new device", async () => {
    const { device } = fakeDevice();
    const transport = new BleTransport({ bluetooth: { async requestDevice() { return device; } }, secureContext: true });
    await transport.requestDevice(profile);
    device.gatt.connected = false;
    for (const handler of device.handlers) handler();
    assert.equal(transport.state, BLE_STATES.DISCONNECTED);
    await transport.connect(profile);
    assert.equal(transport.state, BLE_STATES.READY);
});

test("print coordinator serializes jobs and deduplicates automatic order events only", async () => {
    const coordinator = new PrintCoordinator();
    const sequence = [];
    const prepare = async () => { sequence.push("prepare"); return new Uint8Array([1]); };
    const send = async () => { sequence.push("send"); return { transmittedUnconfirmed: true }; };
    const first = await coordinator.enqueue({ orderKey: "O-1", automatic: true, prepare, send });
    const duplicate = await coordinator.enqueue({ orderKey: "O-1", automatic: true, prepare, send });
    const reprint = await coordinator.enqueue({ orderKey: "O-1", automatic: false, prepare, send });
    assert.equal(first.state, JOB_STATES.TRANSMITTED_UNCONFIRMED);
    assert.equal(duplicate.duplicate, true);
    assert.equal(reprint.state, JOB_STATES.TRANSMITTED_UNCONFIRMED);
    assert.equal(sequence.length, 4);
});

test("print coordinator keeps only one transmission active at a time", async () => {
    const coordinator = new PrintCoordinator();
    let active = 0;
    let maximumActive = 0;
    const send = async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {};
    };
    await Promise.all(["A", "B", "C"].map((key) => coordinator.enqueue({
        orderKey: key,
        prepare: async () => new Uint8Array([1]),
        send,
    })));
    assert.equal(maximumActive, 1);
});

test("print coordinator blocks concurrent double-clicks but allows a later manual reprint", async () => {
    const coordinator = new PrintCoordinator();
    let release;
    let markStarted;
    let sends = 0;
    const started = new Promise((resolve) => { markStarted = resolve; });
    const first = coordinator.enqueue({
        orderKey: "O-2",
        prepare: async () => new Uint8Array([1]),
        send: async () => {
            sends += 1;
            markStarted();
            await new Promise((resolve) => { release = resolve; });
        },
    });
    await started;
    const doubleClick = await coordinator.enqueue({
        orderKey: "O-2",
        prepare: async () => new Uint8Array([1]),
        send: async () => { sends += 1; },
    });
    assert.equal(doubleClick.duplicate, true);
    release();
    await first;
    await coordinator.enqueue({
        orderKey: "O-2",
        prepare: async () => new Uint8Array([1]),
        send: async () => { sends += 1; },
    });
    assert.equal(sends, 2);
});

test("raster encoder produces a complete black-and-white raster command and rejects oversize data", () => {
    globalThis.document = {
        createElement() {
            const canvas = { width: 0, height: 0 };
            canvas.getContext = () => ({
                fillStyle: "",
                fillRect() {},
                drawImage() {},
                getImageData(_x, _y, width, height) {
                    const data = new Uint8ClampedArray(width * height * 4);
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = data[i + 1] = data[i + 2] = 255;
                        data[i + 3] = 255;
                    }
                    data[0] = data[1] = data[2] = 0;
                    return { data };
                },
            });
            return canvas;
        },
    };
    const output = encodeEscPosRaster({ width: 8, height: 1 }, { widthDots: 8, feedLines: 3 });
    assert.deepEqual([...output], [0x1d, 0x76, 0x30, 0, 1, 0, 1, 0, 0x80, 0x1b, 0x64, 3]);
    assert.throws(() => encodeEscPosRaster({ width: 8, height: 1 }, { widthDots: 8, maxBytes: 0 }), /receipt_exceeds_transfer_limit/);
});
