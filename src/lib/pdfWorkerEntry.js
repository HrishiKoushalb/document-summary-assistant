// The actual PDF parsing runs inside this dedicated Worker thread, which has
// its own independent global scope — patching Uint8Array.prototype on the
// main thread (see polyfills.js) does NOT reach in here. So this small entry
// script applies the same polyfill inside the worker itself, before handing
// off to pdf.js's real worker implementation.
import './polyfills.js';
import 'pdfjs-dist/build/pdf.worker.mjs';
