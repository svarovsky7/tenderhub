# Исправление бага с фантомными буквами в боковом меню

## Проблема
При раскрытии бокового меню (после сворачивания) появлялись "фантомные буквы" - артефакты текста во время анимации.

## Причина
Ant Design Sider не корректно скрывал текст пунктов меню во время анимации collapse/expand. Текст был виден частично за пределами контейнера.

## Решение
Добавлены CSS правила в `src/components/layout/AppLayout.tsx`:

1. **Принудительное скрытие overflow для Sider:**
   ```css
   .ant-layout-sider {
     overflow: hidden !important;
   }
   .ant-layout-sider-children {
     overflow: hidden !important;
   }
   ```

2. **Скрытие текста в свернутом состоянии:**
   ```css
   .ant-layout-sider-collapsed .ant-menu-item .ant-menu-title-content,
   .ant-layout-sider-collapsed .ant-menu-submenu-title .ant-menu-title-content {
     opacity: 0 !important;
     width: 0 !important;
     transition: opacity 0.1s ease-out, width 0.1s ease-out !important;
   }
   ```

3. **Плавное появление текста при раскрытии:**
   ```css
   .ant-layout-sider:not(.ant-layout-sider-collapsed) .ant-menu-item .ant-menu-title-content,
   .ant-layout-sider:not(.ant-layout-sider-collapsed) .ant-menu-submenu-title .ant-menu-title-content {
     opacity: 1 !important;
     width: auto !important;
     transition: opacity 0.2s ease-in 0.1s, width 0.2s ease-in 0.1s !important;
   }
   ```

4. **Предотвращение переполнения текста:**
   ```css
   .ant-menu-item, .ant-menu-submenu-title {
     overflow: hidden !important;
   }
   .ant-menu-title-content {
     overflow: hidden !important;
     text-overflow: clip !important;
     white-space: nowrap !important;
   }
   ```

## Тестирование
Создан Playwright тест `tests/sidebar-menu.spec.ts` для автоматической проверки:
- Тест сворачивания/разворачивания меню
- Создание скриншотов анимации (5 кадров при collapse и expand)
- Проверка отсутствия фантомных popup меню
- Многократное тестирование циклов (3 цикла)

Запуск тестов:
```bash
npm run test           # Headless режим
npm run test:headed    # С открытым браузером
npm run test:ui        # UI для отладки
npm run test:debug     # Режим отладки
```

## Результат
✅ Анимация раскрытия/сворачивания работает плавно без визуальных артефактов
✅ Текст пунктов меню полностью скрыт в свернутом состоянии
✅ Нет "фантомных букв" во время анимации
✅ Popup меню корректно очищаются после анимации

## Файлы изменены
- `src/components/layout/AppLayout.tsx` - добавлены CSS правила для исправления бага
- `tests/sidebar-menu.spec.ts` - создан тест для проверки функциональности
- `playwright.config.ts` - конфигурация Playwright
- `package.json` - добавлены скрипты для запуска тестов
