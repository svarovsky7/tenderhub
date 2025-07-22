ТЕХНИЧЕСКОЕ ЗАДАНИЕ (v 1.1)
Проект: TenderHub — портал тендерного отдела
Дата: 22 июля 2025 г.
Назначение: ТЗ для разработки и последующей загрузки в Codex/Confluence.

ЦЕЛИ И ОТЛИЧИЯ НОВОЙ ВЕРСИИ
• Поддержка OAuth 2 (Google, Microsoft) поверх Supabase Auth.
• Добавлена роль «Администратор».
• Импорт ВОР из Excel.
• Библиотека работ/материалов для повторного использования.
• Дашборд аналитики (win‑rate, динамика затрат).
• Onboarding‑wizard и AI‑подсказки от Codex.
• WCAG 2.1 AA, mobile‑first.
• Optimistic‑locking и resolver конфликтов при совместном редактировании.

ОБЗОР РЫНКА И ПРИНЯТЫЕ BEST‑PRACTICE
Cost estimating & take‑off: CostOS, STACK, RIB Candy – совместное редактирование и библиотеки позиций.
Document management: Oracle Aconex, Bluebeam – массовая загрузка чертежей, встроенный PDF/DWG‑viewer.
Bid management: Procore, Autodesk ACC – хронология и дашборды win‑rate.
Procurement workflow: ProcurePro – сквозной процесс «тендер → договор» с надбавками и рисками.

ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

3.1 Импорт ВОР
F‑1.1  Excel/CSV (xlsx, xls, csv).
F‑1.2  Хранение исходных файлов в Supabase Storage

3.2 Пользователи и роли
Администратор — управление пользователями, справочниками, настройками маржи, импорт ВОР, назначение инженеров, утверждение цены.
Инженер — редактирование строк, загрузка КП, загрузка чертежей.
Просмотр — только чтение.
Аутентификация: Supabase Auth (e‑mail + пароль) + OAuth.


3.3 Таблица BOQ
• Ant Design Editable VirtualTable (react‑window).
• Подстроки типов: «раб», «мат», «суб‑раб», «суб‑мат».
• Массовая вставка, автодополнение из библиотеки позиций.
• Формула строки: quantity × coef × price_unit.

3.4 Файлы
• Drag‑and‑drop, до 250 МБ.
• Предпросмотр PDF, изображений.
• Версионирование по подпапкам с датой.

3.5 Синхронность и конфликты
• Supabase Realtime, канал tender:{id}.
• Optimistic locking по updated_at.
• Resolver при конфликте: «Объединить / Перезаписать / Откатить».
• Цель latency < 300 мс.

3.6 Библиотека позиций
• Таблицы lib_works и lib_materials.
• Импорт из Excel и прошлых тендеров.
• Поиск по классификатору (при необходимости ГЭСН/ТСН).

3.7 Аналитика и отчёты
• Дашборд: количество тендеров, win‑rate, прямые и коммерческие затраты.
• Отчёты XLSX/PDF: «Прямые затраты», «Коммерческое предложение», «История изменений».
• Графики win‑rate и распределения маржи.

3.8 Расчёт коммерческой стоимости
• Edge Function /calcCommercialCost.
• Надбавки: накладные %, риск %, маржа %.
• Сценарии Base / Best‑Case / Worst‑Case, снапшот в history_log.

АРХИТЕКТУРА РЕШЕНИЯ

Front‑end: React 18, TypeScript, Vite, Ant Design 5, TanStack Query.
Real‑time: Supabase Realtime WebSocket.
Back‑end: Supabase (PostgreSQL 16, Edge Functions Deno, Storage).
DevOps: GitHub Actions → Vercel (FE) / Supabase Cloud (BE).
Observability: Sentry, Grafana Cloud, OTEL.

UX‑РЕШЕНИЯ
Onboarding‑wizard (пошаговая загрузка ВОР, настройка марк‑апов).
AI‑assist Codex (предложения материалов по ключевым словам).
Drag‑to‑select для групповых действий.

Горячие клавиши: Alt+Enter (новая подстрока), Ctrl+S (сохранить).

НЕФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ
Производительность: импорт 5 000 строк Excel ≤ 30 с; рендер 10 000 строк ≤ 100 мс.
Параллелизм: 100 одновременных пользователей (k6 — 100 VU × 2 мин без ошибок).
Доступность: 99,9 % в месяц; mobile‑friendly; WCAG 2.1 AA.
Безопасность: TLS 1.3, RLS, MFA; ноль критических OWASP‑рисков.
Масштабируемость: горизонтальный upscale кластера Realtime.
Управляемость: history_log, Sentry alerts, MTTR ≤ 5 мин.


КРИТЕРИИ ПРИЁМКИ

Импорт 5 000 строк ≤ 30 с.
Совместное редактирование (2 инженера) без конфликтов, latency < 300 мс.
Корректный пересчёт коммерческой цены при смене коэффициентов.
Полная запись действий в history_log.
OWASP ZAP — 0 критических уязвимостей.
API /tenders/{id}/rows (95‑й перцентиль) < 150 мс.
Дашборд win‑rate обновляется минимум раз в сутки.

