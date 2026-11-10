import { useEffect, useRef, useState } from 'react';

const EXIT_MS = 260;
let lockCount = 0;
let savedScrollY = 0;

/**
 * Блокировка фона под модальным окном.
 * Одного overflow: hidden мало: iOS Safari всё равно прокручивает и двигает страницу
 * под шторкой. Поэтому body фиксируется на месте с сохранением позиции прокрутки.
 */
function lockScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;
  savedScrollY = window.scrollY;
  const { style } = document.body;
  style.position = 'fixed';
  style.top = `-${savedScrollY}px`;
  style.left = '0';
  style.right = '0';
  style.overflow = 'hidden';
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;
  const { style } = document.body;
  style.position = '';
  style.top = '';
  style.left = '';
  style.right = '';
  style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

/**
 * Общая логика модальных окон: анимация появления/исчезновения,
 * блокировка прокрутки, Escape, ловушка фокуса и возврат фокуса.
 */
export function useModal(open: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Монтирование / размонтирование с задержкой под анимацию.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Пока открыто: блокируем фон, слушаем клавиатуру, держим фокус внутри.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      // Реагирует только верхнее модальное окно.
      const all = document.querySelectorAll('[data-modal-panel]');
      if (all[all.length - 1] !== panel) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === 'Tab') {
        const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return { mounted, visible, panelRef };
}
