import { Highlighter } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ErrorBanner from './components/ErrorBanner';
import ResultView from './components/ResultView';
import { useDocumentProcessor } from './hooks/useDocumentProcessor';

export default function App() {
  const {
    status, stage, progress, error, fileMeta,
    extractedText, length, result,
    processFile, setLength, reset,
  } = useDocumentProcessor();

  const isBusy = status === 'extracting' || status === 'summarizing';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mark text-ink">
              <Highlighter size={17} strokeWidth={2} />
            </span>
            <span className="font-display text-[1.05rem] tracking-tight text-ink-text">
              Document Summary Assistant
            </span>
          </div>
          <span className="hidden sm:block font-mono text-[11px] uppercase tracking-wider text-ink-text-muted">
            Runs in your browser
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-10 sm:px-8 sm:py-16">
        {status === 'idle' && (
          <div className="rise-in">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mark">Upload · Extract · Summarize</p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl leading-[1.1] text-ink-text">
              Read less.<br />Know more.
            </h1>
            <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-ink-text-muted">
              Drop in a PDF or a scanned image. It reads the pages — running OCR
              automatically wherever a page has no text layer — then ranks and
              highlights the sentences that carry the document.
            </p>

            <div className="mt-8">
              <FileUpload onFileSelected={processFile} />
            </div>
          </div>
        )}

        {isBusy && (
          <ProcessingStatus fileMeta={fileMeta} stage={stage} progress={progress} status={status} />
        )}

        {status === 'error' && (
          <ErrorBanner message={error?.message} onRetry={reset} />
        )}

        {status === 'done' && result && (
          <ResultView
            fileMeta={fileMeta}
            result={result}
            length={length}
            onLengthChange={setLength}
            extractedText={extractedText}
            onReset={reset}
          />
        )}
      </main>

      <footer className="border-t border-ink-line">
        <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
          <p className="font-mono text-[11px] text-ink-text-muted">
            Text extraction, OCR, and summarization all run locally in your browser —
            your documents are never uploaded to a server.
          </p>
        </div>
      </footer>
    </div>
  );
}
