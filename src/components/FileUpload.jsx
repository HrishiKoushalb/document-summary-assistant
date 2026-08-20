import { useCallback, useRef, useState } from 'react';
import { FileUp, FileText, Image as ImageIcon } from 'lucide-react';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp';

export default function FileUpload({ onFileSelected }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback((fileList) => {
    const file = fileList?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={[
          'group relative w-full rounded-2xl border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-4 px-6 py-16 sm:py-20 text-center cursor-pointer',
          isDragOver
            ? 'border-accent bg-accent/[0.08] scale-[1.01]'
            : 'border-border bg-surface hover:border-text-faint hover:bg-surface/80',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div
          className={[
            'flex h-16 w-16 items-center justify-center rounded-full border transition-colors',
            isDragOver ? 'border-accent bg-accent text-surface' : 'border-border bg-bg text-accent-deep',
          ].join(' ')}
        >
          <FileUp size={26} strokeWidth={1.75} />
        </div>

        <div>
          <p className="font-serif text-xl sm:text-2xl text-text">
            {isDragOver ? 'Drop it right here' : 'Drop a document, or browse'}
          </p>
          <p className="mt-1.5 text-sm text-text-muted">
            PDF, PNG, JPG, or WEBP — scanned pages are handled automatically
          </p>
        </div>

        <div className="mt-2 flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-text-faint">
          <span className="flex items-center gap-1.5"><FileText size={13} /> PDF</span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5"><ImageIcon size={13} /> Scanned image</span>
          <span className="h-3 w-px bg-border" />
          <span>Max 20MB</span>
        </div>
      </button>
    </div>
  );
}
