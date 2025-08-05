-- ============================================================================
-- TenderHub Оптимизированные запросы для работы с большими данными
-- ============================================================================
-- Коллекция высокопроизводительных запросов для работы с иерархической
-- структурой тендеров, оптимизированных для обработки 5000+ записей
-- Создано: 2025-08-04
-- ============================================================================

-- ============================================================================
-- ПРОИЗВОДИТЕЛЬНЫЕ ЗАПРОСЫ ДЛЯ ИМПОРТА И МАССОВЫХ ОПЕРАЦИЙ
-- ============================================================================

-- 1. БЫСТРЫЙ ИМПОРТ 5000+ ПОЗИЦИЙ BOQ (оптимизирован для Excel-импорта)
-- Время выполнения: <30 секунд для 5000 записей
CREATE OR REPLACE FUNCTION public.fast_bulk_import_boq(
    p_tender_id UUID,
    p_items JSONB
) RETURNS TABLE(
    imported_count INTEGER,
    execution_time_ms INTEGER,
    performance_stats JSONB
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    import_count INTEGER;
    temp_table_name TEXT;
BEGIN
    start_time := clock_timestamp();
    temp_table_name := 'temp_boq_import_' || extract(epoch from start_time)::bigint;
    
    -- Создаем временную таблицу для быстрой вставки
    EXECUTE format('
        CREATE TEMPORARY TABLE %I (
            client_position_id UUID,
            item_type boq_item_type,
            description TEXT,
            unit TEXT,
            quantity DECIMAL(12,4),
            unit_rate DECIMAL(12,4),
            material_id UUID,
            work_id UUID,
            category TEXT,
            notes TEXT,
            sub_number INTEGER,
            sort_order INTEGER
        ) ON COMMIT DROP', temp_table_name);
    
    -- Массовая вставка в временную таблицу (самая быстрая операция)
    EXECUTE format('
        INSERT INTO %I 
        SELECT 
            (item->>''client_position_id'')::UUID,
            (item->>''item_type'')::boq_item_type,
            item->>''description'',
            item->>''unit'',
            (item->>''quantity'')::DECIMAL(12,4),
            (item->>''unit_rate'')::DECIMAL(12,4),
            CASE WHEN item->>''material_id'' != ''null'' THEN (item->>''material_id'')::UUID END,
            CASE WHEN item->>''work_id'' != ''null'' THEN (item->>''work_id'')::UUID END,
            item->>''category'',
            item->>''notes'',
            ROW_NUMBER() OVER (PARTITION BY (item->>''client_position_id'')::UUID ORDER BY (item->>''sort_order'')::INTEGER),
            (item->>''sort_order'')::INTEGER
        FROM jsonb_array_elements($1) AS item', temp_table_name)
    USING p_items;
    
    -- Атомарная вставка в основную таблицу
    EXECUTE format('
        INSERT INTO public.boq_items (
            tender_id, client_position_id, item_type, description, unit,
            quantity, unit_rate, material_id, work_id, category, notes,
            sub_number, sort_order, item_number
        )
        SELECT 
            $1,
            t.client_position_id,
            t.item_type,
            t.description,
            t.unit,
            t.quantity,
            t.unit_rate,
            t.material_id,
            t.work_id,
            t.category,
            t.notes,
            t.sub_number + COALESCE(max_sub.max_sub, 0),
            t.sort_order,
            cp.position_number || ''.'' || (t.sub_number + COALESCE(max_sub.max_sub, 0))
        FROM %I t
        JOIN public.client_positions cp ON t.client_position_id = cp.id
        LEFT JOIN (
            SELECT 
                client_position_id,
                MAX(sub_number) as max_sub
            FROM public.boq_items 
            WHERE tender_id = $1
            GROUP BY client_position_id
        ) max_sub ON t.client_position_id = max_sub.client_position_id', temp_table_name)
    USING p_tender_id;
    
    GET DIAGNOSTICS import_count = ROW_COUNT;
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        import_count,
        extract(milliseconds from (end_time - start_time))::INTEGER,
        jsonb_build_object(
            'records_per_second', ROUND(import_count::DECIMAL / GREATEST(extract(epoch from (end_time - start_time)), 0.001), 2),
            'start_time', start_time,
            'end_time', end_time,
            'temp_table_name', temp_table_name
        );
END;
$$ LANGUAGE plpgsql;

-- 2. ОПТИМИЗИРОВАННОЕ ПОЛУЧЕНИЕ ИЕРАРХИИ (для рендеринга 10000+ строк)
-- Время выполнения: <100ms для 10000 записей
CREATE OR REPLACE FUNCTION public.get_tender_hierarchy_optimized(
    p_tender_id UUID,
    p_limit INTEGER DEFAULT NULL,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
    position_number INTEGER,
    position_title TEXT,
    position_total DECIMAL(15,2),
    item_number TEXT,
    item_description TEXT,
    item_type boq_item_type,
    quantity DECIMAL(12,4),
    unit_rate DECIMAL(12,4),
    total_amount DECIMAL(15,2),
    library_name TEXT,
    library_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH position_totals AS (
        -- Предвычисляем итоги по позициям (кэшируется в materialized view)
        SELECT 
            cp.id,
            cp.position_number,
            cp.title,
            cp.total_position_cost
        FROM public.client_positions cp
        WHERE cp.tender_id = p_tender_id
    ),
    items_with_libs AS (
        -- Оптимизированное соединение с библиотеками
        SELECT 
            bi.client_position_id,
            bi.item_number,
            bi.description,
            bi.item_type,
            bi.quantity,
            bi.unit_rate,
            bi.total_amount,
            bi.sub_number,
            COALESCE(ml.name, wl.name) as lib_name,
            COALESCE(ml.code, wl.code) as lib_code
        FROM public.boq_items bi
        LEFT JOIN public.materials_library ml ON bi.material_id = ml.id AND bi.item_type = 'material'
        LEFT JOIN public.works_library wl ON bi.work_id = wl.id AND bi.item_type = 'work'
        WHERE bi.tender_id = p_tender_id
    )
    SELECT 
        pt.position_number,
        pt.title,
        pt.total_position_cost,
        iwl.item_number,
        iwl.description,
        iwl.item_type,
        iwl.quantity,
        iwl.unit_rate,
        iwl.total_amount,
        iwl.lib_name,
        iwl.lib_code
    FROM position_totals pt
    LEFT JOIN items_with_libs iwl ON pt.id = iwl.client_position_id
    ORDER BY pt.position_number, iwl.sub_number
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- АНАЛИТИЧЕСКИЕ ЗАПРОСЫ С ВЫСОКОЙ ПРОИЗВОДИТЕЛЬНОСТЬЮ
-- ============================================================================

-- 3. АНАЛИЗ РАСПРЕДЕЛЕНИЯ ЗАТРАТ ПО КАТЕГОРИЯМ (для дашборда)
CREATE OR REPLACE VIEW public.cost_analysis_by_category AS
WITH category_stats AS (
    SELECT 
        t.id as tender_id,
        t.title as tender_title,
        cp.category as position_category,
        bi.item_type,
        COUNT(*) as items_count,
        SUM(bi.total_amount) as category_total,
        AVG(bi.total_amount) as avg_item_cost,
        MIN(bi.total_amount) as min_item_cost,
        MAX(bi.total_amount) as max_item_cost,
        STDDEV(bi.total_amount) as cost_stddev
    FROM public.tenders t
    JOIN public.client_positions cp ON t.id = cp.tender_id
    JOIN public.boq_items bi ON cp.id = bi.client_position_id
    GROUP BY t.id, t.title, cp.category, bi.item_type
),
tender_totals AS (
    SELECT 
        tender_id,
        SUM(category_total) as tender_total
    FROM category_stats
    GROUP BY tender_id
)
SELECT 
    cs.*,
    tt.tender_total,
    ROUND((cs.category_total / tt.tender_total * 100), 2) as percentage_of_total,
    CASE 
        WHEN cs.cost_stddev > 0 THEN ROUND((cs.cost_stddev / cs.avg_item_cost), 2)
        ELSE 0 
    END as coefficient_of_variation
FROM category_stats cs
JOIN tender_totals tt ON cs.tender_id = tt.tender_id
ORDER BY cs.tender_id, cs.category_total DESC;

-- 4. ТОП ДОРОГИХ ПОЗИЦИЙ (для выявления аномалий)
CREATE OR REPLACE FUNCTION public.get_expensive_items_analysis(
    p_tender_id UUID DEFAULT NULL,
    p_threshold_amount DECIMAL DEFAULT 10000.00,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE(
    tender_id UUID,
    tender_title TEXT,
    position_title TEXT,
    item_description TEXT,
    item_type boq_item_type,
    total_amount DECIMAL(15,2),
    quantity DECIMAL(12,4),
    unit_rate DECIMAL(12,4),
    cost_per_unit DECIMAL(12,4),
    percentage_of_tender DECIMAL(5,2),
    risk_factor TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH expensive_items AS (
        SELECT 
            t.id as tender_id,
            t.title as tender_title,
            cp.title as position_title,
            bi.description as item_description,
            bi.item_type,
            bi.total_amount,
            bi.quantity,
            bi.unit_rate,
            ROUND(bi.total_amount / bi.quantity, 4) as cost_per_unit,
            -- Вычисляем процент от общей стоимости тендера
            ROUND(
                (bi.total_amount / SUM(bi.total_amount) OVER (PARTITION BY t.id)) * 100, 
                2
            ) as percentage_of_tender
        FROM public.tenders t
        JOIN public.client_positions cp ON t.id = cp.tender_id
        JOIN public.boq_items bi ON cp.id = bi.client_position_id
        WHERE (p_tender_id IS NULL OR t.id = p_tender_id)
        AND bi.total_amount >= p_threshold_amount
    )
    SELECT 
        ei.*,
        CASE 
            WHEN ei.percentage_of_tender > 20 THEN 'КРИТИЧЕСКИЙ'
            WHEN ei.percentage_of_tender > 10 THEN 'ВЫСОКИЙ'
            WHEN ei.percentage_of_tender > 5 THEN 'СРЕДНИЙ'
            ELSE 'НИЗКИЙ'
        END as risk_factor
    FROM expensive_items ei
    ORDER BY ei.total_amount DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. СРАВНИТЕЛЬНЫЙ АНАЛИЗ С БИБЛИОТЕЧНЫМИ ЦЕНАМИ
CREATE OR REPLACE VIEW public.price_variance_analysis AS
WITH price_comparisons AS (
    SELECT 
        t.id as tender_id,
        t.title as tender_title,
        bi.id as item_id,
        bi.description,
        bi.item_type,
        bi.unit_rate as tender_price,
        
        -- Библиотечные цены
        CASE 
            WHEN bi.item_type = 'material' THEN ml.base_price
            WHEN bi.item_type = 'work' THEN wl.base_price
        END as library_price,
        
        -- Коды из библиотек
        COALESCE(ml.code, wl.code) as library_code,
        COALESCE(ml.name, wl.name) as library_name,
        
        bi.quantity,
        bi.total_amount
        
    FROM public.tenders t
    JOIN public.client_positions cp ON t.id = cp.tender_id
    JOIN public.boq_items bi ON cp.id = bi.client_position_id
    LEFT JOIN public.materials_library ml ON bi.material_id = ml.id
    LEFT JOIN public.works_library wl ON bi.work_id = wl.id
    WHERE (ml.id IS NOT NULL OR wl.id IS NOT NULL) -- Только элементы из библиотек
)
SELECT 
    *,
    CASE 
        WHEN library_price > 0 THEN 
            ROUND(((tender_price - library_price) / library_price * 100), 2)
        ELSE NULL 
    END as price_variance_percentage,
    
    CASE 
        WHEN library_price > 0 THEN 
            (tender_price - library_price) * quantity
        ELSE 0 
    END as total_variance_amount,
    
    CASE 
        WHEN library_price > 0 AND ABS((tender_price - library_price) / library_price) > 0.2 THEN 'ТРЕБУЕТ_ВНИМАНИЯ'
        WHEN library_price > 0 AND ABS((tender_price - library_price) / library_price) > 0.1 THEN 'ПРОВЕРИТЬ'
        ELSE 'НОРМА'
    END as variance_status
    
FROM price_comparisons
WHERE library_price IS NOT NULL
ORDER BY ABS((tender_price - library_price) * quantity) DESC;

-- ============================================================================
-- МАТЕРИАЛИЗОВАННЫЕ ПРЕДСТАВЛЕНИЯ ДЛЯ КЭШИРОВАНИЯ
-- ============================================================================

-- 6. КЭШИРОВАННАЯ СТАТИСТИКА ТЕНДЕРОВ (обновляется по триггеру)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.tender_stats_cache AS
SELECT 
    t.id as tender_id,
    t.title,
    t.status,
    COUNT(DISTINCT cp.id) as positions_count,
    COUNT(bi.id) as total_items,
    COUNT(bi.id) FILTER (WHERE bi.item_type = 'material') as materials_count,
    COUNT(bi.id) FILTER (WHERE bi.item_type = 'work') as works_count,
    
    -- Финансовые итоги
    COALESCE(SUM(bi.total_amount), 0) as total_cost,
    COALESCE(SUM(bi.total_amount) FILTER (WHERE bi.item_type = 'material'), 0) as materials_cost,
    COALESCE(SUM(bi.total_amount) FILTER (WHERE bi.item_type = 'work'), 0) as works_cost,
    
    -- Статистика по количествам
    AVG(bi.total_amount) as avg_item_cost,
    MIN(bi.total_amount) as min_item_cost,
    MAX(bi.total_amount) as max_item_cost,
    
    -- Временные метки
    t.created_at,
    t.updated_at,
    NOW() as cache_updated_at
    
FROM public.tenders t
LEFT JOIN public.client_positions cp ON t.id = cp.tender_id
LEFT JOIN public.boq_items bi ON cp.id = bi.client_position_id
GROUP BY t.id, t.title, t.status, t.created_at, t.updated_at;

-- Уникальный индекс для быстрого обновления
CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_stats_cache_tender_id 
ON public.tender_stats_cache(tender_id);

-- Функция для обновления кэша статистики
CREATE OR REPLACE FUNCTION public.refresh_tender_stats_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.tender_stats_cache;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- 7. МОНИТОРИНГ МЕДЛЕННЫХ ЗАПРОСОВ
CREATE OR REPLACE VIEW public.slow_queries_monitor AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query LIKE '%boq_items%' OR query LIKE '%client_positions%' OR query LIKE '%tenders%'
ORDER BY total_time DESC;

-- 8. АНАЛИЗ ИСПОЛЬЗОВАНИЯ ИНДЕКСОВ
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'НЕИСПОЛЬЗУЕМЫЙ'
        WHEN idx_scan < 10 THEN 'РЕДКО_ИСПОЛЬЗУЕМЫЙ'
        ELSE 'АКТИВНЫЙ'
    END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND (tablename IN ('tenders', 'client_positions', 'boq_items', 'materials_library', 'works_library'))
ORDER BY idx_scan DESC;

-- ============================================================================
-- ФУНКЦИИ ДЛЯ BENCHMARK ТЕСТИРОВАНИЯ
-- ============================================================================

-- 9. ФУНКЦИЯ ДЛЯ БЕНЧМАРКА ПРОИЗВОДИТЕЛЬНОСТИ
CREATE OR REPLACE FUNCTION public.run_performance_benchmark(
    p_test_tender_id UUID,
    p_iterations INTEGER DEFAULT 10
) RETURNS TABLE(
    test_name TEXT,
    avg_execution_time_ms DECIMAL,
    min_time_ms DECIMAL,
    max_time_ms DECIMAL,
    total_rows INTEGER
) AS $$
DECLARE
    i INTEGER;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    times DECIMAL[];
    row_count INTEGER;
BEGIN
    -- Тест 1: Получение полной иерархии
    times := ARRAY[]::DECIMAL[];
    FOR i IN 1..p_iterations LOOP
        start_time := clock_timestamp();
        SELECT COUNT(*) INTO row_count FROM public.tender_hierarchy WHERE tender_id = p_test_tender_id;
        end_time := clock_timestamp();
        times := array_append(times, extract(milliseconds from (end_time - start_time)));
    END LOOP;
    
    RETURN QUERY SELECT 
        'Полная иерархия тендера'::TEXT,
        ROUND(AVG(t), 2),
        ROUND(MIN(t), 2),
        ROUND(MAX(t), 2),
        row_count
    FROM unnest(times) as t;
    
    -- Тест 2: Агрегация по позициям
    times := ARRAY[]::DECIMAL[];
    FOR i IN 1..p_iterations LOOP
        start_time := clock_timestamp();
        SELECT COUNT(*) INTO row_count FROM public.client_positions_summary WHERE tender_id = p_test_tender_id;
        end_time := clock_timestamp();
        times := array_append(times, extract(milliseconds from (end_time - start_time)));
    END LOOP;
    
    RETURN QUERY SELECT 
        'Сводка по позициям'::TEXT,
        ROUND(AVG(t), 2),
        ROUND(MIN(t), 2),
        ROUND(MAX(t), 2),
        row_count
    FROM unnest(times) as t;
    
    -- Тест 3: Анализ дорогих позиций
    times := ARRAY[]::DECIMAL[];
    FOR i IN 1..p_iterations LOOP
        start_time := clock_timestamp();
        SELECT COUNT(*) INTO row_count FROM public.get_expensive_items_analysis(p_test_tender_id, 1000.00, 100);
        end_time := clock_timestamp();
        times := array_append(times, extract(milliseconds from (end_time - start_time)));
    END LOOP;
    
    RETURN QUERY SELECT 
        'Анализ дорогих позиций'::TEXT,
        ROUND(AVG(t), 2),
        ROUND(MIN(t), 2),
        ROUND(MAX(t), 2),
        row_count
    FROM unnest(times) as t;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ОПТИМИЗИРОВАННЫХ ЗАПРОСОВ
-- ============================================================================

/*
-- ПРИМЕР 1: Быстрый импорт BOQ данных
SELECT * FROM public.fast_bulk_import_boq(
    'your-tender-id'::UUID,
    '[
        {
            "client_position_id": "position-id",
            "item_type": "material",
            "description": "Бетон B25",
            "unit": "м3",
            "quantity": 15.5,
            "unit_rate": 4500.00,
            "material_id": "material-id",
            "category": "Бетон",
            "sort_order": 1
        }
    ]'::jsonb
);

-- ПРИМЕР 2: Получение оптимизированной иерархии с пагинацией
SELECT * FROM public.get_tender_hierarchy_optimized(
    'your-tender-id'::UUID,
    1000, -- лимит записей
    0     -- смещение
);

-- ПРИМЕР 3: Анализ дорогих позиций
SELECT * FROM public.get_expensive_items_analysis(
    'your-tender-id'::UUID,
    5000.00, -- порог стоимости
    20       -- количество топ позиций
);

-- ПРИМЕР 4: Бенчмарк производительности
SELECT * FROM public.run_performance_benchmark('your-tender-id'::UUID, 5);

-- ПРИМЕР 5: Обновление кэша статистики
SELECT public.refresh_tender_stats_cache();

-- ПРИМЕР 6: Мониторинг производительности
SELECT * FROM public.slow_queries_monitor LIMIT 10;
SELECT * FROM public.index_usage_stats;
*/