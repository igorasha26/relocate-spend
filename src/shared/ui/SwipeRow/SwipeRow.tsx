import { useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
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

/** Ширина плитки действия + зазор. */
const TILE = 70;
const GAP = 6;
/** Сколько пикселей нужно сдвинуть палец, чтобы жест считался горизонтальным. */
const START = 7;
/** Быстрый «щелчок» пальцем открывает/закрывает независимо от пройденного пути (px/мс). */
const FLICK = 0.35;

/**
 * Строка со свайпом влево: из-под строки выезжают мягкие плитки действий.
 * Во время жеста строка двигается напрямую через transform — без перерисовок React,
 * поэтому идёт ровно за пальцем. Отпустили — доезжает с плавным замедлением;
 * быстрый взмах открывает или закрывает сразу.
 * Вертикальная прокрутка не блокируется (touch-action: pan-y).
 */
export function SwipeRow({ actions, open, onOpenChange, onPress, children, className }: Props) {
  const width = actions.length * TILE + GAP;
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    base: number;
    swiping: boolean;
    offset: number;
    lastX: number;
    lastT: number;
    v: number;
  } | null>(null);
  // После свайпа браузер всё равно шлёт click — его нужно погасить
  const suppressClick = useRef(false);

  /** Поставить строку в положение offset (0 — закрыта, -width — открыта). */
  const place = (offset: number, animate: boolean) => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    root.toggleAttribute('data-dragging', !animate);
    content.style.transform = offset ? `translate3d(${offset}px, 0, 0)` : '';
    const progress = Math.min(1, Math.max(0, -offset / width));
    root.style.setProperty('--progress', String(progress));
    root.toggleAttribute('data-revealed', offset < 0);
  };

  // Открытие/закрытие снаружи (открыли другую строку, нажали на действие)
  useLayoutEffect(() => {
    if (!gesture.current?.swiping) place(open ? -width : 0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width]);

  // Открытая строка закрывается от касания в другом месте и от прокрутки
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && rootRef.current?.contains(e.target as Node)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, onOpenChange]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressClick.current = false;
    const base = open ? -width : 0;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base,
      swiping: false,
      offset: base,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.swiping) {
      if (Math.abs(dy) > START && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null; // это вертикальная прокрутка
        return;
      }
      if (Math.abs(dx) < START) return;
      g.swiping = true;
      // начинаем от точки, где жест стал горизонтальным, — без рывка на START пикселей
      g.x = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // Скорость: сглаженная, чтобы один дёрганый кадр не решал судьбу жеста
    const dt = Math.max(1, e.timeStamp - g.lastT);
    g.v = 0.7 * ((e.clientX - g.lastX) / dt) + 0.3 * g.v;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;

    const raw = g.base + (e.clientX - g.x);
    // За пределами — мягкая «резинка»
    g.offset = raw > 0 ? raw / 6 : raw < -width ? -width + (raw + width) / 3 : raw;
    place(g.offset, false);
  };

  const finish = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (!g.swiping) return;
    suppressClick.current = true;
    const next = g.v < -FLICK ? true : g.v > FLICK ? false : g.offset < -width * 0.4;
    place(next ? -width : 0, true);
    if (next !== open) onOpenChange(next);
  };

  return (
    <div ref={rootRef} className={cn(styles.root, className)}>
      <div className={styles.actions} style={{ width }} aria-hidden={!open}>
        {actions.map((action, i) => (
          <button
            key={action.label}
            type="button"
            tabIndex={open ? 0 : -1}
            className={cn(styles.action, styles[action.tone ?? 'accent'])}
            // ближняя к строке плитка появляется первой
            style={{ '--i': actions.length - 1 - i } as CSSProperties}
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
        ref={contentRef}
        className={styles.content}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
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
