// NOTE: previously switched to pdf.js's "legacy" build here on the theory
// that Safari lacked a newer JS built-in pdf.js's modern build relies on.
// That didn't clear the crash on real device (still failing, on a device
// reporting Safari 26.6 - too new for that theory to hold), and the legacy
// build drags in a large webpack-bundled core-js polyfill layer of its own,
// which is a plausible new failure source in its own right. Reverted to
// the modern build to remove that variable while the real cause gets
// diagnosed from an unminified trace (see vite.config.js).
import * as pdfjsLib from 'pdfjs-dist';
import { recognizeText } from './ocrExtractor';

// pdf.js normally offloads PDF parsing to a separate Web Worker thread.
// Real-device testing turned up multiple distinct, hard-to-predict ways
// that can fail on mobile browsers (the worker failing to start at all, or
// starting but failing partway through a specific document) that never
// reproduced in desktop or automated testing. Rather than keep chasing
// individual failure modes one at a time, parsing runs directly on the
// main thread, unconditionally, for every device. That means there's no
// Worker involved at all - no module-worker requirement, no per-browser
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
// effectively empty - almost always a scanned/photographed page inside an
// otherwise-digital PDF - and we fall back to rendering + OCR for that page.
const MIN_CHARS_PER_PAGE_FOR_TEXT_LAYER = 40;

/**
 * Extracts text from every page of a PDF. Pages with a real text layer are
 * read directly (fast, exact). Pages that appear to be scanned images
 * (no usable text layer) are rendered to a canvas and passed through OCR,
 * so a mixed or fully-scanned PDF still produces usable text.
 *
 * @param {File} file
 * @param {{ onStage?: (label: string) => void, onProgress?: (info: object) => void }} [callbacks]
 */
export async function extractPdfText(file, { onStage, onProgress } = {}) {
  await ensureMainThreadPdfWorker();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const pageTexts = [];
  let scannedPageCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText.length >= MIN_CHARS_PER_PAGE_FOR_TEXT_LAYER) {
      onStage?.(`Reading page ${pageNum} of ${numPages}`);
      pageTexts.push(pageText);
    } else {
      scannedPageCount += 1;
      onStage?.(`Page ${pageNum} of ${numPages} looks scanned - running OCR`);
      const canvas = await renderPageToCanvas(page);
      const ocrText = await recognizeText(canvas, (p) => {
        onProgress?.({ page: pageNum, totalPages: numPages, ocrProgress: p });
      });
      pageTexts.push(ocrText.trim());
      canvas.width = 0;
      canvas.height = 0; // release canvas memory promptly
    }

    onProgress?.({ page: pageNum, totalPages: numPages, ocrProgress: null });
  }

  return {
    text: pageTexts.join('\n\n').trim(),
    numPages,
    scannedPageCount,
  };
}

async function renderPageToCanvas(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}
