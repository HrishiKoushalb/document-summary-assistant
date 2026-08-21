import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

// Re-summarizing recomputes the full TextRank graph, which gets noticeably
// heavier on a long document - debounce so fast typing doesn't queue up
// a recompute per keystroke.
const DEBOUNCE_MS = 350;

export default function QueryControl({ value, onChange, disabled }) {
  const [draft, setDraft] = useState(value);
  // Resets `draft` when `value` changes externally (e.g. a new file
  // clears the query) without an effect - see the React docs' "adjusting
  // state when a prop changes" pattern.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  const timeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleInput = (e) => {
    const next = e.target.value;
    setDraft(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(next), DEBOUNCE_MS);
  };

  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 font-mono text-xs sm:text-sm transition-colors focus-within:border-accent-deep">
      <Search size={14} className="shrink-0 text-text-faint" />
      <input
        type="text"
        value={draft}
        onChange={handleInput}
        disabled={disabled}
        placeholder="Focus on… e.g. “pricing” or “security risks”"
        aria-label="Focus the summary on a topic"
        className="w-full bg-transparent text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}
