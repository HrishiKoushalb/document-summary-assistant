import { useState } from 'react';
import { AlertTriangle, ChevronDown, RotateCcw } from 'lucide-react';

export default function ErrorBanner({ message, detail, onRetry }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-error/30 bg-error-soft px-6 py-10 text-center rise-in">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-error/30 text-error">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </div>
      <p className="mt-4 font-serif text-lg text-text">Couldn&apos;t process that document</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-deep hover:text-accent-deep"
      >
        <RotateCcw size={15} /> Try another file
      </button>

      {detail && (
        <div className="mx-auto mt-5 max-w-sm text-left">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="mx-auto flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-text-faint hover:text-text-muted"
          >
            <ChevronDown size={12} className={`transition-transform ${showDetail ? 'rotate-180' : ''}`} />
            Show technical details
          </button>
          {showDetail && (
            <div className="mt-2 rounded-lg border border-error/20 bg-surface px-3 py-2.5">
              <p className="break-words font-mono text-[11px] leading-relaxed text-text-muted">
                {detail}
              </p>
              {typeof navigator !== 'undefined' && (
                <p className="mt-1.5 break-words font-mono text-[10px] leading-relaxed text-text-faint">
                  {navigator.userAgent}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}