/**
 * polyfills.js
 *
 * pdfjs-dist (v6) uses very new JavaScript features that not all browsers
 * support yet, which throw confusing errors deep inside PDF parsing if
 * missing. These are feature-detected and polyfilled here - no-op when
 * the browser already has native support.
 *
 * 1. Uint8Array.prototype.toHex / fromBase64 - used during basic PDF
 *    parsing (part of the TC39 "Uint8Array to/from base64/hex" proposal).
 * 2. Map.prototype.getOrInsertComputed / getOrInsert - used internally by
 *    pdf.js's page-rendering code specifically, which only runs when
 *    rendering a scanned/image-based PDF page to canvas for OCR (part of
 *    the TC39 "Map/Set upsert" proposal).
 */
const HEX_CHARS = '0123456789abcdef';

if (typeof Uint8Array.prototype.toHex !== 'function') {
  // eslint-disable-next-line no-extend-native
  Uint8Array.prototype.toHex = function toHex() {
    let out = '';
    for (let i = 0; i < this.length; i++) {
      const byte = this[i];
      out += HEX_CHARS[(byte >> 4) & 0xf] + HEX_CHARS[byte & 0xf];
    }
    return out;
  };
}

if (typeof Uint8Array.fromHex !== 'function') {
  Uint8Array.fromHex = function fromHex(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  };
}

if (typeof Uint8Array.prototype.toBase64 !== 'function') {
  // eslint-disable-next-line no-extend-native
  Uint8Array.prototype.toBase64 =