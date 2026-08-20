import * as pdfjsLib from 'pdfjs-dist';
// Our own worker entry (not pdfjs's raw worker file) — it applies a
// polyfill inside the worker's global scope before pdf.js runs. See
// pdfWorkerEntry.js for why this indirection is needed.
import pdfjsWorkerUrl from './pdfWorkerEntry.js?worker&url';
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
 * @param {File} file
 * @param {{ onStage?: (label: string) => void, onProgress?: (info: object) => void }} [callbacks]
 */
export async function extractPdfText(file, { onStage, onProgress } = {}) {
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
