import { useCallback, useRef, useState } from 'react';
import { summarize } from '../lib/summarizer';

// pdfjs-dist and tesseract.js are both sizeable libraries (PDF parsing +
// a WASM OCR engine). They're dynamically imported so the initial page
// load only ships React and the UI — the ~2MB OCR/PDF machinery is fetched
// on demand, the moment someone actually uploads a file.
//
// Because that fetch happens on-demand rather than at page load, a dropped
// connection at exactly the wrong moment (WiFi reconnecting, a VPN toggling)
// can make the browser fail to download that chunk. `importWithRetry` gives
// that a couple of automatic retries before giving up, and the error is
// reported distinctly from "this file is corrupt" so the person knows to
// just try again rather than assume their file is broken.
async function importWithRetry(importFn, retries = 2, delayMs = 700) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await importFn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

function isDynamicImportNetworkError(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('dynamically imported module')
    || msg.includes('Importing a module script failed')
    || msg.includes('NETWORK_CHANGED')
    || err?.name === 'ChunkLoadError'
  );
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — generous for a client-side demo
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const ERROR_MESSAGES = {
  UNSUPPORTED_TYPE: 'That file type isn\'t supported. Upload a PDF, PNG, JPG, or WEBP.',
  FILE_TOO_LARGE: 'That file is over the 20MB limit. Try a smaller file.',
  NO_TEXT: 'No readable text was found in this document — the pages may be blank, or the scan quality may be too low for OCR.',
  EXTRACTION_FAILED: 'This file couldn\'t be read. It may be corrupted, password-protected, or in an unexpected format.',
  NETWORK_ERROR: 'Your connection dropped while loading part of the app. Check your internet connection and try again — your file itself is likely fine.',
  UNKNOWN: 'Something went wrong while processing this document. Please try again.',
};

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'UNSUPPORTED_TYPE';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'FILE_TOO_LARGE';
  }
  return null;
}

/**
 * Orchestrates the full pipeline: validate -> extract (PDF text / OCR) ->
 * summarize. Extraction runs once per file; changing the summary length
 * afterwards is instant since it re-runs only the (cheap) summarizer.
 */
export function useDocumentProcessor() {
  const [status, setStatus] = useState('idle'); // idle | extracting | summarizing | done | error
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [length, setLengthState] = useState('medium');
  const [result, setResult] = useState(null);

  const extractedTextRef = useRef('');

  const runSummary = useCallback((text, len) => {
    try {
      const summaryResult = summarize(text, len);
      setResult(summaryResult);
      setStatus('done');
      setStage('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError({ code: 'NO_TEXT', message: ERROR_MESSAGES.NO_TEXT });
    }
  }, []);

  const setLength = useCallback((len) => {
    setLengthState(len);
    if (extractedTextRef.current) {
      runSummary(extractedTextRef.current, len);
    }
  }, [runSummary]);

  const processFile = useCallback(async (file) => {
    setError(null);
    setResult(null);
    setExtractedText('');
    extractedTextRef.current = '';
    setProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setStatus('error');
      setError({ code: validationError, message: ERROR_MESSAGES[validationError] });
      return;
    }

    setFileMeta({ name: file.name, size: file.size, type: file.type });
    setStatus('extracting');
    setStage(file.type === 'application/pdf' ? 'Opening PDF…' : 'Reading image…');

    try {
      let text = '';
      let pageInfo = null;

      if (file.type === 'application/pdf') {
        const { extractPdfText } = await importWithRetry(() => import('../lib/pdfExtractor'));
        const extraction = await extractPdfText(file, {
          onStage: (label) => setStage(label),
          onProgress: ({ page, totalPages, ocrProgress }) => {
            const pageShare = 1 / totalPages;
            const base = (page - 1) * pageShare;
            const withinPage = ocrProgress != null ? ocrProgress * pageShare : pageShare;
            setProgress(Math.round((base + withinPage) * 100));
          },
        });
        text = extraction.text;
        pageInfo = { numPages: extraction.numPages, scannedPageCount: extraction.scannedPageCount };
      } else {
        setStage('Running OCR on image…');
        const { recognizeText } = await importWithRetry(() => import('../lib/ocrExtractor'));
        text = await recognizeText(file, (p) => setProgress(Math.round(p * 100)));
      }

      if (!text || text.trim().length === 0) {
        setStatus('error');
        setError({ code: 'NO_TEXT', message: ERROR_MESSAGES.NO_TEXT });
        return;
      }

      setExtractedText(text);
      extractedTextRef.current = text;
      setFileMeta((prev) => ({ ...prev, ...pageInfo }));
      setStatus('summarizing');
      setStage('Ranking key sentences…');
      // Yield a frame so the "summarizing" UI state is visible even though
      // TextRank itself typically completes in well under 100ms.
      await new Promise((resolve) => setTimeout(resolve, 150));
      runSummary(text, length);
    } catch (err) {
      console.error(err);
      setStatus('error');
      if (isDynamicImportNetworkError(err)) {
        setError({ code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR });
      } else {
        setError({ code: 'EXTRACTION_FAILED', message: ERROR_MESSAGES.EXTRACTION_FAILED });
      }
    }
  }, [length, runSummary]);

  const reset = useCallback(() => {
    setStatus('idle');
    setStage('');
    setProgress(0);
    setError(null);
    setFileMeta(null);
    setExtractedText('');
    extractedTextRef.current = '';
    setResult(null);
  }, []);

  return {
    status,
    stage,
    progress,
    error,
    fileMeta,
    extractedText,
    length,
    result,
    processFile,
    setLength,
    reset,
  };
}
