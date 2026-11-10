import { NavLink } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '@/shared/ui';
import styles from './TabBar.module.css';

const TABS: { to: string; icon: IconName; labelKey: 'tabs.home' | 'tabs.add' | 'tabs.profile'; end?: boolean; primary?: boolean }[] = [
  { to: routes.home, icon: 'home', labelKey: 'tabs.home', end: true },
  { to: routes.add, icon: 'plusCircle', labelKey: 'tabs.add', primary: true },
  { to: routes.profile, icon: 'user', labelKey: 'tabs.profile' },
];

export function TabBar() {
  const { t } = useI18n();
  return (
    <nav className={styles.tabBar} aria-label="Main">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => cn(styles.tab, tab.primary && styles.primary, isActive && styles.active)}
        >
          <span className={styles.iconWrap}>
            <Icon name={tab.icon} size={tab.primary ? 26 : 24} strokeWidth={1.7} className={styles.iconOutline} />
            {tab.primary && <Icon name="plus" size={24} strokeWidth={2} className={styles.iconPlus} />}
          </span>
          <span className={styles.label}>{t(tab.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
