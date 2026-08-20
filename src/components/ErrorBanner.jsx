import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="w-full rounded-2xl border border-rust/40 bg-rust-soft px-6 py-10 text-center rise-in">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rust/40 text-rust">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </div>
      <p className="mt-4 font-display text-lg text-ink-text">Couldn&apos;t process that document</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft px-4 py-2 text-sm font-medium text-ink-text transition-colors hover:border-mark hover:text-mark"
      >
        <RotateCcw size={15} /> Try another file
      </button>
    </div>
  );
}
