import { ApiError } from '@/shared/api';
import type { TranslationKey } from '@/shared/i18n';

/** Ошибку Supabase — в понятный текст. Коды: https://supabase.com/docs/guides/auth/debugging/error-codes */
export function authErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return 'auth.errors.unknown';
  if (error.code === 'not_configured') return 'auth.errors.unavailable';
  if (error.isNetwork) return 'auth.errors.network';
  const code = error.code;
  const msg = error.message.toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'auth.errors.invalidCredentials';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered'))
    return 'auth.errors.userExists';
  if (code === 'weak_password' || msg.includes('password should')) return 'auth.errors.weakPassword';
  if (code === 'otp_expired' || code === 'otp_disabled' || msg.includes('token has expired') || msg.includes('invalid otp'))
    return 'auth.errors.invalidCode';
  if (error.status === 429 || code.includes('rate_limit')) return 'auth.errors.rateLimit';
  if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('email address'))
    return 'auth.errors.invalidEmail';
  return 'auth.errors.unknown';
}

export const isEmailNotConfirmed = (error: unknown) =>
  error instanceof ApiError && (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message));

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export const MIN_PASSWORD = 8;
