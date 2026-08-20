import { Loader2, ScanText } from 'lucide-react';

export default function ProcessingStatus({ fileMeta, stage, progress, status }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-surface px-6 py-10 sm:py-14 text-center rise-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg text-accent-deep">
        {status === 'summarizing' ? (
          <ScanText size={24} strokeWidth={1.75} />
        ) : (
          <Loader2 size={24} strokeWidth={1.75} className="animate-spin" />
        )}
      </div>

      <p className="mt-5 font-serif text-lg sm:text-xl text-text">
        {status === 'summarizing' ? 'Ranking the most important sentences…' : (stage || 'Reading document…')}
      </p>

      {fileMeta?.name && (
        <p className="mt-1 font-mono text-xs text-text-muted truncate max-w-sm mx-auto">
          {fileMeta.name}
        </p>
      )}

      <div className="mx-auto mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border-soft">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${status === 'summarizing' ? 100 : Math.max(6, progress)}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[11px] text-text-muted">
        {status === 'summarizing' ? 'almost there' : `${Math.max(0, Math.min(100, progress))}%`}
      </p>
    </div>
  );
}
