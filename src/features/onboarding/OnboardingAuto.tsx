import { Onboarding } from './Onboarding';
import { markOnboardingDone, useOnboardingDone } from './state';

/** Показывает обучение один раз — при самом первом запуске. */
export function OnboardingAuto() {
  const done = useOnboardingDone();
  return <Onboarding open={!done} onClose={markOnboardingDone} />;
}
