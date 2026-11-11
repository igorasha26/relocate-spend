import { analytics } from '@/shared/analytics';
import { Onboarding } from './Onboarding';
import { markOnboardingDone, useOnboardingDone } from './state';

/** Показывает обучение один раз — при самом первом запуске. */
export function OnboardingAuto() {
  const done = useOnboardingDone();
  return (
    <Onboarding
      open={!done}
      onClose={(completed, slide) => {
        // completed — дошёл до «Начать пользоваться»; иначе «Пропустить» (slide — на каком слайде)
        analytics.track(completed ? 'onboarding_completed' : 'onboarding_skipped', { slide });
        markOnboardingDone();
      }}
    />
  );
}
