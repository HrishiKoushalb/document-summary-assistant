import { createWorker } from 'tesseract.js';

let workerPromise = null;

// Tesseract.js pulls its worker script, WASM engine, and language model
// from a CDN by default - bundled locally instead so a corporate proxy
// or ad-blocker can't silently break OCR.
const WORKER_PATH = '/tesseract/worker.min.js';
const CORE_PATH = '/tesseract/tesseract-core-simd-lstm.wasm.js';
const LANG_PATH = '/tesseract';

function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress || 0);
        }
      },
    });
  }
  return workerPromise;
}

/**
 * Runs OCR on an image source (File, Blob, HTMLCanvasElement, or data URL).
 * @param {File|Blob|HTMLCanvasElement|string} imageSource
 * @param {(progress: number) => void} [onProgress] progress in [0, 1]
 * @returns {Promise<string>} recognized text
 */
export async function recognizeText(imageSource, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(imageSource);
  return data.text || '';
}

/**
 * Terminates the shared OCR worker, freeing the WASM instance/thread.
 * Safe to call even if no worker was ever created.
 */
export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    workerPromise = null;
    await worker.terminate();
  }
}
