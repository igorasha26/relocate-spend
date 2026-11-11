import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, Pager } from '@/shared/ui';
import { useModal } from '@/shared/ui/Sheet/useModal';
import { AddArt, GesturesArt, OverviewArt, WelcomeArt } from './Illustrations';
import styles from './Onboarding.module.css';

interface Slide {
  art: () => ReactNode;
  title: TranslationKey;
  text: TranslationKey;
}

const SLIDES: Slide[] = [
  { art: WelcomeArt, title: 'onboarding.s1Title', text: 'onboarding.s1Text' },
  { art: AddArt, title: 'onboarding.s2Title', text: 'onboarding.s2Text' },
  { art: OverviewArt, title: 'onboarding.s3Title', text: 'onboarding.s3Text' },
  { art: GesturesArt, title: 'onboarding.s4Title', text: 'onboarding.s4Text' },
];

interface Props {
  open: boolean;
  /** completed — дошли до последнего слайда и нажали «Начать»; slide — номер слайда (с 1). */
  onClose: (completed: boolean, slide: number) => void;
}

/** Обучение при первом запуске: слайды листаются свайпом или кнопкой «Далее». */
export function Onboarding({ open, onClose }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const skip = () => onClose(false, index + 1);
  const { mounted, visible, panelRef } = useModal(open, skip);
  const [wasOpen, setWasOpen] = useState(open);
  // При каждом открытии начинаем с первого слайда
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(0);
  }

  if (!mounted) return null;

  const last = index === SLIDES.length - 1;
  const render = (i: number) => {
    const slide = SLIDES[i];
    if (!slide) return null;
    const Art = slide.art;
    return (
      <div className={styles.slide}>
        <Art />
        <h2 className={styles.title}>{t(slide.title)}</h2>
        <p className={styles.text}>{t(slide.text)}</p>
      </div>
    );
  };

  return createPortal(
    <div className={cn(styles.root, visible && styles.visible)}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(SLIDES[index]!.title)}
        tabIndex={-1}
        data-modal-panel
        className={styles.panel}
      >
        <header className={styles.top}>
          {index === 0 ? <span className={styles.beta}>{t('onboarding.beta')}</span> : <span />}
          {!last && (
            <button type="button" className={styles.skip} onClick={skip}>
              {t('onboarding.skip')}
            </button>
          )}
        </header>

        <Pager
          pageKey={String(index)}
          canPrev={index > 0}
          canNext={!last}
          onChange={(dir) => setIndex((i) => Math.min(Math.max(i + dir, 0), SLIDES.length - 1))}
          prev={render(index - 1)}
          current={render(index)}
          next={render(index + 1)}
          className={styles.pager}
        />

        <footer className={styles.bottom}>
          <div className={styles.dots} role="tablist">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${SLIDES.length}`}
                className={cn(styles.dot, i === index && styles.dotActive)}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <Button onClick={() => (last ? onClose(true, index + 1) : setIndex(index + 1))}>
            {last ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
