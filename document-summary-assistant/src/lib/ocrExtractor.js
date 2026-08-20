import { createWorker } from 'tesseract.js';

let workerPromise = null;

// Tesseract.js pulls three things at runtime by default: its worker script,
// the WASM OCR engine, and the English language model — all from public
// CDNs (jsdelivr). That's an unnecessary external dependency for a
// "production-quality" app (corporate networks, ad-blockers, or CDN outages
// can all break it silently). Instead, all three are bundled locally under
// public/tesseract/ and served from the same origin as the app.
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
