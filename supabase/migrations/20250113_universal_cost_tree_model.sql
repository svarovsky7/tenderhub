-- ============================================================================
-- МИГРАЦИЯ: Универсальная древовидная модель затрат с неограниченной вложенностью
-- PostgreSQL 15 / Supabase
-- Идемпотентный скрипт (безопасен для повторного запуска)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. ПОДГОТОВКА: Расширения и общие настройки
-- ============================================================================

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. СПРАВОЧНИКИ
-- ============================================================================

-- 1.1 Таблица единиц измерения
CREATE TABLE IF NOT EXISTS public.units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.units IS 'Справочник единиц измерения';
COMMENT ON COLUMN public.units.code IS 'Уникальный код единицы';
COMMENT ON COLUMN public.units.title IS 'Название единицы измерения';

-- 1.2 Расширение таблицы location (если нужны дополнительные поля)
DO $$
BEGIN
    -- Добавляем code если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'location' 
        AND column_name = 'code'
    ) THEN
        ALTER TABLE public.location ADD COLUMN code text UNIQUE;
    END IF;
    
    -- Добавляем title если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'location' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.location ADD COLUMN title text;
    END IF;
END $$;

-- ============================================================================
-- 2. УНИВЕРСАЛЬНАЯ МОДЕЛЬ КАТАЛОГА ЗАТРАТ
-- ============================================================================

-- 2.1 Основная таблица узлов дерева
CREATE TABLE IF NOT EXISTS public.cost_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES public.cost_nodes(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('group', 'item')),
    name text NOT NULL,
    code text,
    unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
    location_id uuid REFERENCES public.location(id) ON DELETE SET NULL,
    sort_order integer NOT NULL DEFAULT 0,
    path ltree,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Уникальность имени в рамках родителя
    CONSTRAINT unique_name_per_parent UNIQUE(parent_id, name)
);

COMMENT ON TABLE public.cost_nodes IS 'Универсальный справочник узлов дерева затрат';
COMMENT ON COLUMN public.cost_nodes.kind IS 'Тип узла: group (категория) или item (элемент)';
COMMENT ON COLUMN public.cost_nodes.path IS 'Материализованный путь для быстрой навигации по дереву';
COMMENT ON COLUMN public.cost_nodes.metadata IS 'Дополнительные данные в JSON';

-- 2.2 Индексы для cost_nodes
-- GIST по path для операций с деревом
CREATE INDEX IF NOT EXISTS idx_cost_nodes_path ON public.cost_nodes USING GIST (path);

-- btree для сортировки и навигации
CREATE INDEX IF NOT EXISTS idx_cost_nodes_parent_sort ON public.cost_nodes (parent_id, sort_order);

-- GIN для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_cost_nodes_search ON public.cost_nodes 
    USING GIN (to_tsvector('russian', coalesce(name,'') || ' ' || coalesce(code,'')));

-- Индекс для фильтрации по типу
CREATE INDEX IF NOT EXISTS idx_cost_nodes_kind ON public.cost_nodes (kind);

-- Индекс для активных записей
CREATE INDEX IF NOT EXISTS idx_cost_nodes_active ON public.cost_nodes (is_active) WHERE is_active = true;

-- ============================================================================
-- 2.3 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДЕРЕВОМ
-- ============================================================================

-- Функция для создания метки узла
CREATE OR REPLACE FUNCTION public._make_label(node_sort_order integer)
RETURNS text AS $$
BEGIN
    RETURN lpad(node_sort_order::text, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Функция для вычисления пути узла
CREATE OR REPLACE FUNCTION public._calc_path(node_id uuid, node_sort_order integer)
RETURNS ltree AS $$
DECLARE
    parent_path ltree;
    parent_rec record;
    node_label text;
BEGIN
    -- Получаем родителя
    SELECT parent_id, path INTO parent_rec
    FROM public.cost_nodes
    WHERE id = node_id;
    
    -- Если нет родителя - это корневой узел
    IF parent_rec.parent_id IS NULL THEN
        RETURN public._make_label(node_sort_order)::ltree;
    END IF;
    
    -- Получаем путь родителя
    SELECT path INTO parent_path
    FROM public.cost_nodes
    WHERE id = parent_rec.parent_id;
    
    -- Формируем путь текущего узла
    node_label := public._make_label(node_sort_order);
    
    IF parent_path IS NULL THEN
        RETURN node_label::ltree;
    ELSE
        RETURN parent_path || node_label::ltree;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2.4 ТРИГГЕРНЫЕ ФУНКЦИИ
-- ============================================================================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для updated_at если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_cost_nodes_updated_at'
    ) THEN
        CREATE TRIGGER update_cost_nodes_updated_at
            BEFORE UPDATE ON public.cost_nodes
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Функция для автоподбора sort_order и вычисления path
CREATE OR REPLACE FUNCTION public.cost_nodes_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
    max_sort integer;
    old_path ltree;
BEGIN
    -- При вставке, если sort_order = 0, подбираем следующий
    IF TG_OP = 'INSERT' AND NEW.sort_order = 0 THEN
        SELECT COALESCE(MAX(sort_order), 0) + 10 INTO max_sort
        FROM public.cost_nodes
        WHERE parent_id IS NOT DISTINCT FROM NEW.parent_id;
        
        NEW.sort_order := max_sort;
    END IF;
    
    -- Вычисляем path
    NEW.path := public._calc_path(NEW.id, NEW.sort_order);
    
    -- При обновлении, если изменился parent_id или sort_order, нужно обновить всех потомков
    IF TG_OP = 'UPDATE' THEN
        IF OLD.parent_id IS DISTINCT FROM NEW.parent_id OR OLD.sort_order != NEW.sort_order THEN
            -- Запоминаем старый путь для последующего обновления потомков
            old_path := OLD.path;
            
            -- После обновления текущей записи нужно будет обновить потомков
            -- Это делается в AFTER триггере
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем BEFORE триггер
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'cost_nodes_before_insert_update_trigger'
    ) THEN
        CREATE TRIGGER cost_nodes_before_insert_update_trigger
            BEFORE INSERT OR UPDATE ON public.cost_nodes
            FOR EACH ROW
            EXECUTE FUNCTION public.cost_nodes_before_insert_update();
    END IF;
END $$;

-- Функция для каскадного обновления путей потомков
CREATE OR REPLACE FUNCTION public.cost_nodes_after_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Если изменился путь, обновляем всех потомков
    IF OLD.path IS DISTINCT FROM NEW.path THEN
        UPDATE public.cost_nodes
        SET path = NEW.path || subpath(path, nlevel(OLD.path))
        WHERE path <@ OLD.path AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем AFTER триггер
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'cost_nodes_after_update_trigger'
    ) THEN
        CREATE TRIGGER cost_nodes_after_update_trigger
            AFTER UPDATE ON public.cost_nodes
            FOR EACH ROW
            WHEN (OLD.path IS DISTINCT FROM NEW.path)
            EXECUTE FUNCTION public.cost_nodes_after_update();
    END IF;
END $$;

-- ============================================================================
-- 3. СОВМЕСТИМОСТЬ С СУЩЕСТВУЮЩИМИ ТАБЛИЦАМИ
-- ============================================================================

-- 3.1 Проверка и переименование старых таблиц
DO $$
BEGIN
    -- Переименовываем cost_categories если существует
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_categories'
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.cost_categories RENAME TO cost_categories_old;
    END IF;
    
    -- Переименовываем detail_cost_categories если существует
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'detail_cost_categories'
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.detail_cost_categories RENAME TO detail_cost_categories_old;
    END IF;
END $$;

-- 3.2 Создание VIEW для обратной совместимости

-- VIEW для cost_categories (группы/категории)
CREATE OR REPLACE VIEW public.cost_categories AS
SELECT 
    id,
    name,
    sort_order,
    path,
    is_active
FROM public.cost_nodes
WHERE kind = 'group';

COMMENT ON VIEW public.cost_categories IS 'Представление категорий затрат для обратной совместимости';

-- VIEW для detail_cost_categories (элементы/виды затрат)
CREATE OR REPLACE VIEW public.detail_cost_categories AS
SELECT 
    id,
    parent_id AS category_id,
    name,
    unit_id,
    location_id,
    sort_order,
    path,
    is_active
FROM public.cost_nodes
WHERE kind = 'item';

COMMENT ON VIEW public.detail_cost_categories IS 'Представление видов затрат для обратной совместимости';

-- ============================================================================
-- 4. ПЕРЕНОС ДАННЫХ (если были старые таблицы)
-- ============================================================================

DO $$
DECLARE
    rec record;
    v_unit_id uuid;
    v_location_id uuid;
    v_parent_id uuid;
    v_sql text;
    v_has_sort_order boolean;
    v_has_is_active boolean;
    v_has_dcc_sort_order boolean;
    v_has_dcc_is_active boolean;
    v_has_ed_izm boolean;
    v_has_lokalizacija boolean;
BEGIN
    -- Проверяем наличие старых таблиц
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_categories_old'
    ) THEN
        
        -- 4.1 Заполнение справочника единиц измерения
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'detail_cost_categories_old' 
            AND column_name = 'ед_изм'
        ) THEN
            INSERT INTO public.units (code, title)
            SELECT DISTINCT 
                COALESCE("ед_изм", 'unknown') as code,
                COALESCE("ед_изм", 'unknown') as title
            FROM public.detail_cost_categories_old
            WHERE "ед_изм" IS NOT NULL
            ON CONFLICT (code) DO NOTHING;
        END IF;
        
        -- 4.2 Заполнение справочника локализаций
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'detail_cost_categories_old' 
            AND column_name = 'локализация'
        ) THEN
            -- Вставляем новые локализации
            INSERT INTO public.location (id, code, title)
            SELECT DISTINCT 
                gen_random_uuid(),
                lower(regexp_replace(COALESCE("локализация", 'unknown'), '\s+', '_', 'g')),
                COALESCE("локализация", 'unknown')
            FROM public.detail_cost_categories_old
            WHERE "локализация" IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM public.location l 
                    WHERE l.title = "локализация" 
                       OR l.code = lower(regexp_replace("локализация", '\s+', '_', 'g'))
                )
            ON CONFLICT (code) DO NOTHING;
        END IF;
        
        -- 4.3 Перенос категорий (GROUP узлы)
        -- Используем динамический SQL для обработки различных структур таблиц
        
        -- Проверяем наличие колонок
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'cost_categories_old' 
            AND column_name = 'sort_order'
        ) INTO v_has_sort_order;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'cost_categories_old' 
            AND column_name = 'is_active'
        ) INTO v_has_is_active;
        
        -- Строим запрос динамически
        v_sql := 'INSERT INTO public.cost_nodes (id, parent_id, kind, name, sort_order, is_active) ';
        v_sql := v_sql || 'SELECT ';
        v_sql := v_sql || 'COALESCE(id, gen_random_uuid()), ';
        v_sql := v_sql || 'NULL, ';
        v_sql := v_sql || '''group'', ';
        v_sql := v_sql || 'name, ';
        
        IF v_has_sort_order THEN
            v_sql := v_sql || 'ROW_NUMBER() OVER (ORDER BY sort_order, name) * 10, ';
        ELSE
            v_sql := v_sql || 'ROW_NUMBER() OVER (ORDER BY name) * 10, ';
        END IF;
        
        IF v_has_is_active THEN
            v_sql := v_sql || 'COALESCE(is_active, true) ';
        ELSE
            v_sql := v_sql || 'true ';
        END IF;
        
        v_sql := v_sql || 'FROM public.cost_categories_old ';
        v_sql := v_sql || 'ON CONFLICT (parent_id, name) DO NOTHING';
        
        EXECUTE v_sql;
        
        -- 4.4 Перенос видов затрат (ITEM узлы)
        -- Используем динамический SQL для обработки различных структур
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'detail_cost_categories_old'
        ) THEN
            -- Проверяем структуру таблицы detail_cost_categories_old
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'detail_cost_categories_old' 
                AND column_name = 'sort_order'
            ) INTO v_has_dcc_sort_order;
            
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'detail_cost_categories_old' 
                AND column_name = 'is_active'
            ) INTO v_has_dcc_is_active;
            
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'detail_cost_categories_old' 
                AND column_name = 'ед_изм'
            ) INTO v_has_ed_izm;
            
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'detail_cost_categories_old' 
                AND column_name = 'локализация'
            ) INTO v_has_lokalizacija;
            
            -- Строим и выполняем динамический запрос
            v_sql := 'INSERT INTO public.cost_nodes (id, parent_id, kind, name, unit_id, location_id, sort_order, is_active) ';
            v_sql := v_sql || 'SELECT ';
            v_sql := v_sql || 'COALESCE(dcc.id, gen_random_uuid()), ';
            v_sql := v_sql || '(SELECT cn.id FROM public.cost_nodes cn JOIN public.cost_categories_old cc ON cc.id = dcc.category_id WHERE cn.name = cc.name AND cn.kind = ''group'' LIMIT 1), ';
            v_sql := v_sql || '''item'', ';
            v_sql := v_sql || 'dcc.name, ';
            
            IF v_has_ed_izm THEN
                v_sql := v_sql || '(SELECT id FROM public.units WHERE code = dcc."ед_изм" OR title = dcc."ед_изм" LIMIT 1), ';
            ELSE
                v_sql := v_sql || 'NULL, ';
            END IF;
            
            IF v_has_lokalizacija THEN
                v_sql := v_sql || '(SELECT id FROM public.location WHERE title = dcc."локализация" OR code = lower(regexp_replace(dcc."локализация", ''\s+'', ''_'', ''g'')) LIMIT 1), ';
            ELSE
                v_sql := v_sql || 'NULL, ';
            END IF;
            
            IF v_has_dcc_sort_order THEN
                v_sql := v_sql || 'COALESCE(dcc.sort_order, 0), ';
            ELSE
                v_sql := v_sql || '0, ';
            END IF;
            
            IF v_has_dcc_is_active THEN
                v_sql := v_sql || 'COALESCE(dcc.is_active, true) ';
            ELSE
                v_sql := v_sql || 'true ';
            END IF;
            
            v_sql := v_sql || 'FROM public.detail_cost_categories_old dcc ';
            v_sql := v_sql || 'WHERE dcc.name IS NOT NULL ';
            v_sql := v_sql || 'ON CONFLICT (parent_id, name) DO NOTHING';
            
            EXECUTE v_sql;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. ТЕНДЕРЫ
-- ============================================================================

-- 5.1 Таблица позиций тендера
CREATE TABLE IF NOT EXISTS public.tender_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL, -- REFERENCES public.tenders(id) ON DELETE CASCADE,
    node_id uuid REFERENCES public.cost_nodes(id) ON DELETE SET NULL,
    name_snapshot text NOT NULL,
    unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
    location_id uuid REFERENCES public.location(id) ON DELETE SET NULL,
    quantity numeric(15,3) DEFAULT 0,
    price numeric(15,2) DEFAULT 0,
    amount numeric(15,2) GENERATED ALWAYS AS (quantity * price) STORED,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.tender_items IS 'Позиции тендера с привязкой к справочнику затрат';
COMMENT ON COLUMN public.tender_items.name_snapshot IS 'Снимок названия на момент создания';
COMMENT ON COLUMN public.tender_items.amount IS 'Вычисляемая сумма (quantity * price)';

-- 5.2 Индексы для tender_items
CREATE INDEX IF NOT EXISTS idx_tender_items_tender ON public.tender_items (tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_items_node ON public.tender_items (node_id);

-- 5.3 Триггер для автозаполнения данных из cost_nodes
CREATE OR REPLACE FUNCTION public.tender_items_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    node_rec record;
BEGIN
    -- Если указан node_id, но не заполнены поля - берем из справочника
    IF NEW.node_id IS NOT NULL THEN
        SELECT name, unit_id, location_id 
        INTO node_rec
        FROM public.cost_nodes
        WHERE id = NEW.node_id;
        
        IF FOUND THEN
            NEW.name_snapshot := COALESCE(NEW.name_snapshot, node_rec.name);
            NEW.unit_id := COALESCE(NEW.unit_id, node_rec.unit_id);
            NEW.location_id := COALESCE(NEW.location_id, node_rec.location_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'tender_items_before_insert_trigger'
    ) THEN
        CREATE TRIGGER tender_items_before_insert_trigger
            BEFORE INSERT ON public.tender_items
            FOR EACH ROW
            EXECUTE FUNCTION public.tender_items_before_insert();
    END IF;
END $$;

-- Триггер для updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_tender_items_updated_at'
    ) THEN
        CREATE TRIGGER update_tender_items_updated_at
            BEFORE UPDATE ON public.tender_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- 6. АГРЕГАТЫ ПО ДЕРЕВУ
-- ============================================================================

-- Функция для расчета итогов по дереву
CREATE OR REPLACE FUNCTION public.tender_totals_tree(p_tender_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    path ltree,
    kind text,
    total numeric(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH node_totals AS (
        -- Считаем суммы для каждого узла включая его поддерево
        SELECT 
            n.id,
            n.name,
            n.path,
            n.kind,
            COALESCE(SUM(ti.amount), 0) as total
        FROM public.cost_nodes n
        LEFT JOIN public.cost_nodes child ON child.path <@ n.path
        LEFT JOIN public.tender_items ti ON ti.node_id = child.id AND ti.tender_id = p_tender_id
        GROUP BY n.id, n.name, n.path, n.kind
    )
    SELECT * FROM node_totals
    WHERE total > 0
    ORDER BY path;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.tender_totals_tree IS 'Расчет итогов по дереву затрат для конкретного тендера';

-- ============================================================================
-- 7. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ (закомментированы)
-- ============================================================================

/*
-- Выборка всего дерева для фронтенда:
SELECT 
    id,
    parent_id,
    kind,
    name,
    code,
    unit_id,
    location_id,
    sort_order,
    path::text,
    is_active
FROM public.cost_nodes 
ORDER BY path;

-- Перемещение ветки в другого родителя:
UPDATE public.cost_nodes 
SET parent_id = '123e4567-e89b-12d3-a456-426614174000'::uuid,
    sort_order = 50
WHERE id = '987fcdeb-51a2-43f1-9abc-def012345678'::uuid;

-- Удаление ветки (каскадно удалит всех потомков):
DELETE FROM public.cost_nodes 
WHERE id = '987fcdeb-51a2-43f1-9abc-def012345678'::uuid;

-- Получение всех потомков узла:
SELECT * FROM public.cost_nodes
WHERE path <@ (SELECT path FROM public.cost_nodes WHERE id = :parent_id)
ORDER BY path;

-- Получение пути от корня до узла:
SELECT * FROM public.cost_nodes
WHERE (SELECT path FROM public.cost_nodes WHERE id = :node_id) @> path
ORDER BY nlevel(path);

-- Расчет итогов по тендеру:
SELECT * FROM public.tender_totals_tree('550e8400-e29b-41d4-a716-446655440000'::uuid);
*/

-- ============================================================================
-- 8. RLS ПОЛИТИКИ (закомментированы, активировать при необходимости)
-- ============================================================================

/*
-- Включение RLS на cost_nodes
ALTER TABLE public.cost_nodes ENABLE ROW LEVEL SECURITY;

-- Политика для чтения - доступно всем
CREATE POLICY cost_nodes_select_policy ON public.cost_nodes
    FOR SELECT
    USING (true);

-- Политика для вставки - только lead и admin
CREATE POLICY cost_nodes_insert_policy ON public.cost_nodes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('lead', 'admin')
        )
    );

-- Политика для обновления - только lead и admin
CREATE POLICY cost_nodes_update_policy ON public.cost_nodes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('lead', 'admin')
        )
    );

-- Политика для удаления - только admin
CREATE POLICY cost_nodes_delete_policy ON public.cost_nodes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );
*/

-- ============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================================================

-- Обновляем статистику для оптимизатора
ANALYZE public.cost_nodes;
ANALYZE public.tender_items;

-- Выводим информацию о результатах миграции
DO $$
DECLARE
    v_nodes_count integer;
    v_groups_count integer;
    v_items_count integer;
BEGIN
    SELECT COUNT(*) INTO v_nodes_count FROM public.cost_nodes;
    SELECT COUNT(*) INTO v_groups_count FROM public.cost_nodes WHERE kind = 'group';
    SELECT COUNT(*) INTO v_items_count FROM public.cost_nodes WHERE kind = 'item';
    
    RAISE NOTICE 'Миграция завершена успешно!';
    RAISE NOTICE 'Создано узлов: %, из них групп: %, элементов: %', 
        v_nodes_count, v_groups_count, v_items_count;
END $$;

COMMIT;

-- ============================================================================
-- КОНЕЦ СКРИПТА МИГРАЦИИ
-- ============================================================================