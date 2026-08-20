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
      className="inline-flex rounded-full border border-border bg-surface p-1 font-mono text-xs sm:text-sm"
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
                ? 'bg-accent text-surface font-semibold'
                : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
