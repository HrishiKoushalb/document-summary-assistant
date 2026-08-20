const OPTIONS = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
];

export default function LengthControl({ value, onChange, disabled }) {
  return (
    <div
      role="radiogroup"
      aria-label="Summary length"
      className="inline-flex rounded-full border border-ink-line bg-ink p-1 font-mono text-xs sm:text-sm"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={[
              'rounded-full px-4 py-1.5 uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active
                ? 'bg-mark text-ink font-semibold'
                : 'text-ink-text-muted hover:text-ink-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
