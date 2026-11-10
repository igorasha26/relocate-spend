import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './SwipeRow.module.css';

export interface SwipeAction {
  label: string;
  icon: IconName;
  tone?: 'accent' | 'neutral' | 'danger';
  onClick: () => void;
}

interface Props {
  actions: SwipeAction[];
  /** Открыта ли панель действий (управляется списком — открыта может быть только одна строка). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Обычное нажатие на строку. */
  onPress: () => void;
  children: ReactNode;
  className?: string;
}

const ACTION_WIDTH = 76;
const START_THRESHOLD = 8;

/**
 * Строка со свайпом влево в стиле iOS: под строкой — кнопки действий.
 * Вертикальная прокрутка не блокируется (touch-action: pan-y),
 * свайп включается, только когда жест явно горизонтальный.
 */
export function SwipeRow({ actions, open, onOpenChange, onPress, children, className }: Props) {
  const width = actions.length * ACTION_WIDTH;
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ x: number; y: number; base: number; swiping: boolean } | null>(null);
  // После свайпа браузер всё равно шлёт click — его нужно погасить
  const suppressClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { x: e.clientX, y: e.clientY, base: open ? -width : 0, swiping: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.swiping) {
      if (Math.abs(dy) > START_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null; // это вертикальная прокрутка
        return;
      }
      if (Math.abs(dx) < START_THRESHOLD) return;
      g.swiping = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // За пределами — с «резинкой»
    const raw = g.base + dx;
    const clamped = raw > 0 ? raw / 4 : raw < -width ? -width + (raw + width) / 4 : raw;
    setDrag(clamped);
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.swiping || drag === null) {
      setDrag(null);
      return;
    }
    suppressClick.current = true;
    // Открываем, если протащили дальше трети ширины кнопок
    onOpenChange(drag < -width / 3);
    setDrag(null);
  };

  const offset = drag ?? (open ? -width : 0);

  return (
    <div className={cn(styles.root, className)}>
      <div
        className={cn(styles.actions, offset < 0 && styles.actionsVisible)}
        style={{ width }}
        aria-hidden={!open}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            tabIndex={open ? 0 : -1}
            className={cn(styles.action, styles[action.tone ?? 'accent'])}
            onClick={() => {
              onOpenChange(false);
              action.onClick();
            }}
          >
            <Icon name={action.icon} size={20} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <div
        className={cn(styles.content, drag !== null && styles.dragging)}
        style={{ '--offset': `${offset}px` } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // Click сразу после свайпа — часть жеста, а не нажатие.
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // Нажатие на открытую строку — просто закрыть её.
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        <button type="button" className={styles.press} onClick={onPress}>
          {children}
        </button>
      </div>
    </div>
  );
}
