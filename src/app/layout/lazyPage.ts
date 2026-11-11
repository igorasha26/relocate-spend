import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'relocate-spend:chunk-reload';

/**
 * lazy() с защитой от «потерянных» файлов: после выхода новой версии старые файлы экранов
 * удаляются с хостинга, и давно открытая вкладка не может их загрузить. Тогда один раз
 * перезагружаем страницу — она подтянет новую версию целиком.
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<T>) {
  return lazy(async () => {
    try {
      const component = await load();
      sessionStorage.removeItem(RELOAD_KEY);
      return { default: component };
    } catch (error) {
      // Без сети перезагрузка дала бы страницу ошибки браузера — пусть лучше сработает ErrorBoundary
      if (navigator.onLine && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return new Promise<never>(() => {}); // ждём перезагрузку
      }
      throw error;
    }
  });
}
