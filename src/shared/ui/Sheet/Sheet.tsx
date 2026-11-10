import { useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '../IconButton/IconButton';
import styles from './Sheet.module.css';
import { useModal } from './useModal';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Действие в шапке справа от заголовка (например, «Сбросить»). */
  headerAction?: ReactNode;
  /** Нижняя закреплённая область — обычно основная кнопка. */
  footer?: ReactNode;
  closeLabel?: string;
  children?: ReactNode;
}

/** Нижняя шторка в стиле iOS. */
export function Sheet({ open, onClose, title, subtitle, headerAction, footer, closeLabel = '×', children }: SheetProps) {
  const { mounted, visible, panelRef } = useModal(open, onClose);
  const titleId = useId();
  // Смахивание вниз за ручку/шапку закрывает шторку, как в iOS
  const [dragY, setDragY] = useState<number | null>(null);
  const startY = useRef<number | null>(null);

  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    setDragY(dy > 0 ? dy : dy / 6); // вверх — с сопротивлением
  };
  const onDragEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if ((dragY ?? 0) > 110) onClose();
    setDragY(null);
  };

  if (!mounted) return null;

  return createPortal(
    <div className={cn(styles.root, visible && styles.visible)}>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-modal-panel
        className={cn(styles.panel, dragY !== null && styles.dragging)}
        style={dragY !== null ? ({ '--drag': `${dragY}px` } as CSSProperties) : undefined}
      >
        <div
          className={styles.grabArea}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
        <div className={styles.handle} aria-hidden />
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {headerAction}
          <IconButton icon="close" variant="close" label={closeLabel} onClick={onClose} />
        </header>
        </div>
        <div className={styles.body}>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {children}
        </div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
