import * as pdfjsLib from 'pdfjs-dist';
import { recognizeText } from './ocrExtractor';

// pdf.js normally offloads PDF parsing to a separate Web Worker thread.
// Real-device testing turned up multiple distinct, hard-to-predict ways
// that can fail on mobile browsers (the worker failing to start at all, or
// starting but failing partway through a specific document) that never
// reproduced in desktop or automated testing. Rather than keep chasing
// individual failure modes one at a time, parsing runs directly on the
// main thread, unconditionally, for every device. That means there's no
// Worker involved at all — no module-worker requirement, no per-browser
// Worker quirks, nothing that can behave differently by device. The
// tradeoff is a small amount of parsing speed (imperceptible for a
// typical few-page document, since the UI already shows a progress state
// during this step regardless).
//
// This works by pre-registering pdf.js's own message handler directly,
// which is the documented mechanism pdf.js provides for exactly this kind
// of "run entirely on the main thread" setup.
let mainThreadWorkerReady = null;
function ensureMainThreadPdfWorker() {
  if (!mainThreadWorkerReady) {
    mainThreadWorkerReady = import('pdfjs-dist/build/pdf.worker.mjs').then((workerModule) => {
      globalThis.pdfjsWorker = { WorkerMessageHandler: workerModule.WorkerMessageHandler };
    });
  }
  return mainThreadWorkerReady;
}

// Below this many characters, a page's embedded text layer is treated as
// effectively empty — almost always a scanned/photographed page inside an
// otherwise-digital PDF — and we fall back to rendering + OCR for that page.
const MIN_CHARS_PER_PAGE_FOR_TEXT_LAYER = 40;

/**
 * Extracts text from every page of a PDF. Pages with a real text layer are
 * read directly (fast, exact). Pages that appear to be scanned images
 * (no usable text layer) are rendered to a canvas and passed through OCR,
 * so a mixed or fully-scanned PDF still produces usable text.
 *
 *