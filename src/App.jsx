import { Highlighter } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ErrorBanner from './components/ErrorBanner';
import ResultView from './components/ResultView';
import { useDocumentProcessor } from './hooks/useDocumentProcessor';

export default function App() {
  const {
    status, stage, progress, error, fileMeta,
    extractedText, length, query, result,
    processFile, setLength, setQuery, reset,
  } = useDocumentProcessor();

  const isBusy = status === 'extracting' || status === 'summarizing';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-surface">
              <Highlighter size={17} strokeWidth={2} />
            </span>
            <span className="font-serif text-[1.05rem] tracking-tight text-text">
              Document Summary Assistant
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-10 sm:px-8 sm:py-16">
        {status === 'idle' && (
          <div className="rise-in">
            <h1 className="font-serif text-3xl sm:text-4xl leading-[1.15] text-text">
              Read less. Know more.
            </h1>
            <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-text-muted">
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
          <ErrorBanner message={error?.message} detail={error?.detail} onRetry={reset} />
        )}

        {status === 'done' && result && (
          <ResultView
            fileMeta={fileMeta}
            result={result}
            length={length}
            onLengthChange={setLength}
            query={query}
            onQueryChange={setQuery}
            extractedText={extractedText}
            onReset={reset}
          />
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 space-y-1.5">
          <p className="text-[0.8rem] text-text-faint">
            Text extraction, OCR, and summarization all happen on your own device —
            nothing is uploaded anywhere.
          </p>
          <p className="text-[0.8rem] text-text-faint">
            Made by HrishiKoushal, built for Unthinkable
          </p>
        </div>
      </footer>
    </div>
  );
}