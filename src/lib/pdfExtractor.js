import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { recognizeText } from './ocrExtractor';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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
 * pdf.js normally offloads parsing to a Web Worker. Two distinct things can
 * go wrong on some mobile/embedded browsers, handled two different ways:
 *
 *  1. The Worker fails to even start — pdf.js has its own built-in
 *     fallback for this (transparent to us), which is why `workerSrc`
 *     points directly at pdf.js's own file rather than a custom wrapper:
 *     that fallback works by dynamically importing this exact file for its
 *     exports, and wrapping it in a way Vite treats as "worker-only"
 *     output strips those exports, silently breaking the fallback.
 *  2. The Worker starts fine but fails partway through parsing a specific
 *     document. pdf.js's built-in fallback only covers case 1, so this is
 *     handled here: on any failure, retry once on the main thread by
 *     directly registering the message handler pdf.js looks for.
 *
 * @param {File} file
 * @param {{ onStage?: (label: string) => void, onProgress?: (info: object) => void }} [callbacks]
 */
export async function extractPdfText(file, { onStage, onProgress } = {}) {
  const arrayBuffer = await file.arrayBuffer();

  try {
    return await extractWithPdfjs(arrayBuffer, { onStage, onProgress });
  } catch (err) {
    console.warn('PDF parsing failed, retrying on the main thread:', err);
    if (!globalThis.pdfjsWorker) {
      const workerModule = await import('pdfjs-dist/build/pdf.worker.mjs');
      globalThis.pdfjsWorker = { WorkerMessageHandler: workerModule.WorkerMessageHandler };
    }
    // A fresh ArrayBuffer is required — pdf.js detaches the first one once
    // handed off, even on a failed attempt.
    const retryBuffer = await file.arrayBuffer();
    return extractWithPdfjs(retryBuffer, { onStage, onProgress });
  }
}

async function extractWithPdfjs(arrayBuffer, { onStage, onProgress }) {
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
      onStage?.(`Page ${pageNum} of ${numPages} looks scanned — running OCR`);
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