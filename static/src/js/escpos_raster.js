/** ESC/POS raster encoder. Use only with a profile whose exact model explicitly validates this mode. */
export function encodeEscPosRaster(sourceCanvas, { widthDots, feedLines = 3, maxBytes = 5 * 1024 * 1024 } = {}) {
    if (!sourceCanvas || !Number.isInteger(widthDots) || widthDots < 1 || widthDots > 2048) {
        throw new Error("invalid_raster_dimensions");
    }
    const heightDots = Math.max(1, Math.round(sourceCanvas.height * widthDots / sourceCanvas.width));
    const rowBytes = Math.ceil(widthDots / 8);
    const payloadLength = rowBytes * heightDots;
    if (payloadLength > maxBytes) throw new Error("receipt_exceeds_transfer_limit");
    const canvas = document.createElement("canvas");
    canvas.width = widthDots;
    canvas.height = heightDots;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas_unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, widthDots, heightDots);
    context.drawImage(sourceCanvas, 0, 0, widthDots, heightDots);
    const pixels = context.getImageData(0, 0, widthDots, heightDots).data;
    const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, rowBytes & 0xff, (rowBytes >> 8) & 0xff, heightDots & 0xff, (heightDots >> 8) & 0xff]);
    const bitmap = new Uint8Array(payloadLength);
    for (let y = 0; y < heightDots; y++) {
        for (let x = 0; x < widthDots; x++) {
            const i = (y * widthDots + x) * 4;
            const luminance = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
            if (luminance < 160) bitmap[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
    }
    const suffix = new Uint8Array([0x1b, 0x64, Math.max(0, Math.min(255, feedLines))]);
    const output = new Uint8Array(header.length + bitmap.length + suffix.length);
    output.set(header, 0);
    output.set(bitmap, header.length);
    output.set(suffix, header.length + bitmap.length);
    return output;
}
