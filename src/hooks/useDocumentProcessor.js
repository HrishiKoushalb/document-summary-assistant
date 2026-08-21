import { useCallback, useRef, useState } from 'react';
import { summarize } from '../lib/summarizer';

// pdfjs-dist and tesseract.js are dynamically imported (only fetched once
// someone actually uploads a file) so the initial page load stays light.
// That fetch can fail on a flaky connection, so retry a couple times
// before giving up and reporting it as a network error, not a bad file.
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

// Shown behind "Show technical details" in ErrorBanner - lets a phone
// screenshot double as a bug report since there's no devtools to check.
function describeError(err) {
  if (!err) return 'Unknown error';
  const name = err.name || 'Error';
  const message = err.message || String(err);
  return `${name}: ${message}`;
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
  const [query, setQueryState] = useState('');
  const [result, setResult] = useState(null);

  const extractedTextRef = useRef('');

  const runSummary = useCallback((text, len, q) => {
    try {
      const summaryResult = summarize(text, len, q);
      setResult(summaryResult);
      setStatus('done');
      setStage('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError({
        code: 'NO_TEXT',
        message: ERROR_MESSAGES.NO_TEXT,
        detail: describeError(err),
      });
    }
  }, []);

  const setLength = useCallback((len) => {
    setLengthState(len);
    if (extractedTextRef.current) {
      runSummary(extractedTextRef.current, len, query);
    }
  }, [runSummary, query]);

  const setQuery = useCallback((q) => {
    setQueryState(q);
    if (extractedTextRef.current) {
      runSummary(extractedTextRef.current, length, q);
    }
  }, [runSummary, length]);

  const processFile = useCallback(async (file) => {
    setError(null);
    setResult(null);
    setExtractedText('');
    extractedTextRef.current = '';
    setQueryState('');
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
      // A fresh file always starts with no query (just reset above) -
      // pass '' directly rather than the possibly-stale `query` closure.
      runSummary(text, length, '');
    } catch (err) {
      console.error(err);
      setStatus('error');
      const detail = describeError(err);
      if (isDynamicImportNetworkError(err)) {
        setError({ code: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR, detail });
      } else {
        setError({ code: 'EXTRACTION_FAILED', message: ERROR_MESSAGES.EXTRACTION_FAILED, detail });
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
    setQueryState('');
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
    query,
    result,
    processFile,
    setLength,
    setQuery,
    reset,
  };
}