export type InstallPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

/**
 * Где открыто приложение — от этого зависит инструкция.
 * iPadOS представляется как Mac, поэтому дополнительно проверяем сенсорный экран.
 */
export function detectPlatform(ua = navigator.userAgent): InstallPlatform {
  const isIPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPad;
  if (isIOS) {
    // Chrome, Firefox, Edge, Яндекс и встроенные браузеры на iOS
    const otherBrowser = /CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS|Telegram|Instagram|FBAN|FBAV/.test(ua);
    return otherBrowser ? 'ios-other' : 'ios-safari';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Открыто ли уже как приложение с главного экрана. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
