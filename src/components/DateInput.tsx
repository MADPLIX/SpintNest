import { useRef } from 'react';
import type { InputHTMLAttributes } from 'react';

type DateInputProps = InputHTMLAttributes<HTMLInputElement>;

export function DateInput(props: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const input = inputRef.current;
    if (input) {
      input.focus();
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        {...props}
        className={`w-full px-4 py-3 pr-10 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer ${props.className || ''}`}
      />
      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        title="Kalender öffnen"
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </div>
  );
}
