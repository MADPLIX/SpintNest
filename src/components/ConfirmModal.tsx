import { Modal } from './Modal';

type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Bestätigen',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-6">
        <p className="text-[var(--color-text-muted)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              danger
                ? 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]'
                : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
