import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/shared/analytics';
import { isFeatureOn, useFeature } from '@/shared/config/features';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, Sheet } from '@/shared/ui';
import { RELEASES, type Release } from './releases';
import styles from './WhatsNew.module.css';

const KEY = 'relocate-spend:whats-new-seen';
const ONBOARDING_KEY = 'relocate-spend:onboarding-done';

function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return new Set(RELEASES.map((r) => r.id)); // без хранилища — не показываем
  }
}

function writeSeen(seen: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* не критично */
  }
}

const applicable = (r: Release) => !r.feature || isFeatureOn(r.feature);

// Определяется один раз при запуске, до того как новичок пройдёт обучение:
// новому пользователю уже вышедшие новинки не показываем — он узнает всё из обучения.
let seen = readSeen();
if (seen === null) {
  let existingUser = false;
  try {
    existingUser = localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    /* нет хранилища */
  }
  seen = new Set(existingUser ? [] : RELEASES.filter(applicable).map((r) => r.id));
  writeSeen(seen);
}

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function markSeen(ids: string[]) {
  ids.forEach((id) => seen!.add(id));
  writeSeen(seen!);
  version++;
  listeners.forEach((l) => l());
}

/** Показывает непрочитанные новинки одной шторкой. enabled — когда на экране ничего другого нет. */
export function WhatsNew({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const v = useSyncExternalStore(subscribe, () => version, () => version);
  const qrScan = useFeature('qrScan'); // флаги могли обновиться из базы
  const [closed, setClosed] = useState(false);

  const unseen = useMemo(
    () => RELEASES.filter((r) => applicable(r) && !seen!.has(r.id)),
    // v и qrScan — сигналы, что изменились «прочитанные» или флаги
    [v, qrScan],
  );
  const open = enabled && !closed && unseen.length > 0;
  const cta = unseen.find((r) => r.cta)?.cta;

  const close = (tried = false) => {
    analytics.track('whats_new_closed', { releases: unseen.map((r) => r.id).join(','), tried });
    markSeen(unseen.map((r) => r.id));
    setClosed(true);
    setTimeout(() => setClosed(false), 600);
  };

  return (
    <Sheet
      open={open}
      onClose={() => close()}
      title={t('whatsNew.title')}
      closeLabel={t('common.close')}
      footer={
        <div className={styles.footer}>
          {cta && (
            <Button
              onClick={() => {
                close(true);
                navigate(cta);
              }}
            >
              {t('whatsNew.try')}
            </Button>
          )}
          <Button variant={cta ? 'secondary' : 'primary'} onClick={() => close()}>
            {t('whatsNew.ok')}
          </Button>
        </div>
      }
    >
      <ul className={styles.list}>
        {unseen.flatMap((r) =>
          r.items.map((item) => (
            <li key={`${r.id}-${item.title}`} className={styles.item}>
              <span className={styles.icon}>
                <Icon name={item.icon} size={22} />
              </span>
              <span>
                <span className={styles.title}>{t(item.title)}</span>
                <span className={styles.text}>{t(item.text)}</span>
              </span>
            </li>
          )),
        )}
      </ul>
    </Sheet>
  );
}
