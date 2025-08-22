# MCP Supabase Server

MCP (Model Context Protocol) сервер для взаимодействия с базой данных Supabase.

## Описание

Этот MCP сервер предоставляет инструменты для работы с базой данных Supabase через Claude Desktop или другие MCP-совместимые приложения. Сервер позволяет выполнять CRUD операции, вызывать хранимые процедуры и получать информацию о схеме базы данных.

## Возможности

- **Запросы к БД** (`supabase_query`) - Получение данных с фильтрацией и сортировкой
- **Вставка данных** (`supabase_insert`) - Добавление одной или нескольких записей
- **Обновление данных** (`supabase_update`) - Изменение существующих записей
- **Удаление данных** (`supabase_delete`) - Удаление записей по условию
- **Вызов функций** (`supabase_rpc`) - Выполнение хранимых процедур
- **Схема БД** (`supabase_schema`) - Получение информации о таблицах и их структуре

## Установка

### 1. Установка зависимостей

```bash
cd mcp-supabase-server
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите ваши данные Supabase:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Сборка проекта

```bash
npm run build
```

## Настройка Claude Desktop

Добавьте сервер в конфигурацию Claude Desktop. Файл конфигурации находится по пути:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

Добавьте в секцию `mcpServers`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["C:/Users/nekrasov.l.m/WebstormProjects/tenderhub/mcp-supabase-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

Или используйте переменные окружения из файла `.env`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["C:/Users/nekrasov.l.m/WebstormProjects/tenderhub/mcp-supabase-server/dist/index.js"],
      "env": {
        "DOTENV_CONFIG_PATH": "C:/Users/nekrasov.l.m/WebstormProjects/tenderhub/mcp-supabase-server/.env"
      }
    }
  }
}
```

## Использование

После настройки и перезапуска Claude Desktop, вы сможете использовать инструменты Supabase в чате.

### Примеры использования:

#### Получение данных из таблицы
```
Используй supabase_query чтобы получить все записи из таблицы tenders с лимитом 10
```

#### Фильтрация данных
```
Получи все boq_items где client_position_id равен 'uuid-here' и отсортируй по sort_order
```

#### Вставка данных
```
Добавь новую запись в таблицу materials_library с названием "Новый материал" и единицей измерения "шт"
```

#### Обновление данных
```
Обнови запись в таблице tenders где id = 'uuid' и установи status = 'completed'
```

#### Удаление данных
```
Удали записи из work_material_links где material_id = 'uuid'
```

## Разработка

### Запуск в режиме разработки

```bash
npm run dev
```

### Структура проекта

```
mcp-supabase-server/
├── src/
│   └── index.ts      # Основной файл сервера
├── dist/             # Скомпилированный код
├── .env              # Переменные окружения (не в git)
├── .env.example      # Пример переменных окружения
├── package.json      # Зависимости и скрипты
├── tsconfig.json     # Конфигурация TypeScript
└── README.md         # Документация
```

## Доступные таблицы в проекте TenderHub

- `boq_items` - Элементы ведомости объемов работ
- `client_positions` - Позиции заказчика
- `cost_categories` - Категории затрат
- `detail_cost_categories` - Детализация категорий затрат
- `location` - Локации
- `materials_library` - Библиотека материалов
- `tenders` - Тендеры
- `units` - Единицы измерения
- `work_material_links` - Связи работ и материалов
- `works_library` - Библиотека работ

## Безопасность

- Используйте только `SUPABASE_ANON_KEY` (публичный ключ), не используйте `service_role` ключ
- Настройте RLS (Row Level Security) политики в Supabase для защиты данных
- Не храните чувствительные данные в конфигурационных файлах

## Лицензия

MIT