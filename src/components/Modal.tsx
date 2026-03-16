import { useEffect, useRef } from 'react';

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 id="modal-title" className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
