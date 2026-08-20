import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }) {
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
    </div>
  );
}
