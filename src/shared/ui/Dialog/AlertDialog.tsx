import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { useModal } from '../Sheet/useModal';
import styles from './AlertDialog.module.css';

export interface DialogAction {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  actions: DialogAction[];
}

/**
 * Системный алерт iOS: подтверждение удаления и т. п.
 * Заменяет window.confirm, который блокирует поток и не стилизуется.
 */
export function AlertDialog({ open, onClose, title, message, actions }: AlertDialogProps) {
  const { mounted, visible, panelRef } = useModal(open, onClose);
  const titleId = useId();

  if (!mounted) return null;

  return createPortal(
    <div className={cn(styles.root, visible && styles.visible)}>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-modal-panel
        className={styles.panel}
      >
        <div className={styles.content}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {message && <p className={styles.message}>{message}</p>}
        </div>
        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={cn(styles.action, action.tone === 'danger' && styles.danger)}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
