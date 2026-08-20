/**
 * polyfills.js
 *
 * pdfjs-dist (v6) uses the very new `Uint8Array.prototype.toHex` /
 * `fromBase64` methods (part of the TC39 "Uint8Array to/from base64/hex"
 * proposal). These shipped in recent Chrome/Firefox/Safari, but older or
 * locked-down browsers may not have them yet, which throws a confusing
 * "toHex is not a function" error deep inside PDF parsing.
 *
 * Feature-detected, no-op when the browser already supports these natively.
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
  Uint8Array.prototype.toBase64 = function toBase64() {
    let binary = '';
    for (let i = 0; i < this.length; i++) binary += String.fromCharCode(this[i]);
    return btoa(binary);
  };
}

if (typeof Uint8Array.fromBase64 !== 'function') {
  Uint8Array.fromBase64 = function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };
}


/**
 * `Map.prototype.getOrInsertComputed` / `getOrInsert` (the TC39 "Map/Set
 * upsert" proposal) are used internally by pdf.js's page-rendering code
 * (triggered when rendering a scanned/image-based PDF page to canvas for
 * OCR — a different code path than plain text extraction, which is why
 * this surfaced later than the toHex issue above despite being the same
 * class of problem). Polyfilled the same way: feature-detected, no-op
 * where the browser already has native support.
 */
if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  // eslint-disable-next-line no-extend-native
  Map.prototype.getOrInsertComputed = function getOrInsertComputed(key, callbackfn) {
    if (this.has(key)) return this.get(key);
    const value = callbackfn(key);
    this.set(key, value);
    return value;
  };
}

if (typeof Map.prototype.getOrInsert !== 'function') {
  // eslint-disable-next-line no-extend-native
  Map.prototype.getOrInsert = function getOrInsert(key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}