import { useEffect } from 'react';

/**
 * Хук для предотвращения бесконечных циклов с MediaQueryList listeners
 * Блокирует addEventListener для всех MediaQueryList объектов
 *
 * Проблема: Ant Design и другие библиотеки могут создавать множественные
 * MediaQuery listeners, которые вызывают бесконечные циклы рендеринга
 *
 * Решение: Временно переопределяем window.matchMedia для блокировки
 * добавления новых listeners
 */
export const useMediaQueryFix = () => {
  useEffect(() => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = (query: string) => {
      const mql = originalMatchMedia.call(window, query);

      // Блокируем addEventListener для всех MediaQueryList объектов
      const originalAddListener = mql.addEventListener;
      mql.addEventListener = function(...args: any[]) {
        // Игнорируем все попытки добавить listeners
        return;
      };

      // Блокируем addListener для совместимости со старыми версиями
      (mql as any).addListener = function() {
        return;
      };

      return mql;
    };

    // Восстанавливаем оригинальную функцию при размонтировании
    return () => {
      window.matchMedia = originalMatchMedia;
    };
  }, []);
};