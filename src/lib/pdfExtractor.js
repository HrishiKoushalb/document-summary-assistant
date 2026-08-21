import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { recognizeText } from './ocrExtractor';

// iOS Safari kept crashing on PDF upload with a fake/main-thread worker
// setup pdf.js exposes as an escape hatch (a couple of upstream GitHub
// issues flag it as flaky on Safari). Switched to a real module worker,
// pdf.js's normal supported path everywhere else.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Below this many chars, a page's text layer counts as empty - almost
// always a scanned page - and we OCR it instead.
const MIN_CHARS_PER_PAGE_FOR_TEXT_LAYER = 40;

/**
 * Extracts text from every page of a PDF. Pages with a real text layer are
 * read directly; pages that look scanned get rendered to canvas and OCR'd.
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
      onStage?.(`Page ${pageNum} of ${numPages} looks scanned - running OCR`);
      const canvas = await renderPageToCanvas(page);
      const ocrText = await recognizeText(canvas, (p) => {
        onProgress?.({ page: pageNum, totalPages: numPages, ocrProgress: p });
      });
      pageTexts.push(ocrText.trim());
      canvas.width = 0;
      canvas.height = 0;
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
