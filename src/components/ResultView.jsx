import { useState } from 'react';
import { ChevronDown, Copy, Check, Download, FileText, Image as ImageIcon, RotateCcw, ScanText } from 'lucide-react';
import LengthControl from './LengthControl';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildTextFile(fileMeta, result) {
  const lines = [
    `Summary of ${fileMeta?.name || 'document'}`,
    `${result.originalWordCount} words -> ${result.summaryWordCount} words (${result.reductionPercent}% shorter)`,
    '',
    'SUMMARY',
    result.summary,
    '',
    'KEY POINTS',
    ...result.keyPoints.map((p) => `- ${p}`),
  ];
  return lines.join('\n');
}

export default function ResultView({ fileMeta, result, length, onLengthChange, extractedText, onReset }) {
  const [showExtracted, setShowExtracted] = useState(false);
  const [copied, setCopied] = useState(false);
  const isPdf = fileMeta?.type === 'application/pdf';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildTextFile(fileMeta, result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fail quietly,
      // the download button below still works as a fallback.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([buildTextFile(fileMeta, result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = (fileMeta?.name || 'document').replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${baseName}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full rise-in">
      {/* Meta bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 font-mono text-[11px] sm:text-xs text-text-muted">
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? <FileText size={14} className="shrink-0 text-accent-deep" /> : <ImageIcon size={14} className="shrink-0 text-accent-deep" />}
          <span className="truncate max-w-[10rem] sm:max-w-xs text-text">{fileMeta?.name}</span>
          <span className="hidden sm:inline">· {formatBytes(fileMeta?.size)}</span>
          {isPdf && fileMeta?.numPages && <span className="hidden sm:inline">· {fileMeta.numPages} page{fileMeta.numPages > 1 ? 's' : ''}</span>}
          {fileMeta?.scannedPageCount > 0 && (
            <span className="hidden md:flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-accent-deep">
              <ScanText size={11} /> {fileMeta.scannedPageCount} page{fileMeta.scannedPageCount > 1 ? 's' : ''} OCR&apos;d
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-text-muted transition-colors hover:border-accent-deep hover:text-accent-deep shrink-0"
        >
          <RotateCcw size={12} /> New file
        </button>
      </div>

      {/* Length control + reduction stat */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <LengthControl value={length} onChange={onLengthChange} />
        <div className="font-mono text-xs text-text-muted">
          <span className="text-accent-deep font-semibold">{result.originalWordCount.toLocaleString()}</span> words
          {' → '}
          <span className="text-accent-deep font-semibold">{result.summaryWordCount.toLocaleString()}</span> words
          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-accent-deep">{result.reductionPercent}% shorter</span>
        </div>
      </div>

      {/* Summary card */}
      <div className="mt-4 rounded-2xl border border-border bg-surface paper-texture px-6 py-7 sm:px-8 sm:py-9">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted">Summary</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy summary and key points"
              className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text-muted transition-colors hover:border-accent-deep hover:text-accent-deep"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download summary as a text file"
              className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text-muted transition-colors hover:border-accent-deep hover:text-accent-deep"
            >
              <Download size={12} /> Download
            </button>
          </div>
        </div>
        <p className="mt-3 font-serif text-[1.05rem] sm:text-lg leading-relaxed text-text">
          {result.summary}
        </p>
      </div>

      {/* Key points */}
      {result.keyPoints?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface paper-texture px-6 py-7 sm:px-8 sm:py-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted">Key points</p>
          <ul className="mt-4 space-y-2.5">
            {result.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed text-text">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-deep" aria-hidden="true" />
                <span
                  className="highlight-sweep rounded px-0.5"
                  style={{ '--sweep-delay': `${i * 140}ms` }}
                >
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted text (collapsible) */}
      <div className="mt-4 rounded-2xl border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExtracted((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            View raw extracted text ({result.sentenceCount} sentences)
          </span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform ${showExtracted ? 'rotate-180' : ''}`}
          />
        </button>
        {showExtracted && (
          <div className="max-h-72 overflow-y-auto border-t border-border bg-surface-well px-5 py-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-muted">
              {extractedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
