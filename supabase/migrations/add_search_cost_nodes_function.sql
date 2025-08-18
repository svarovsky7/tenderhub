-- Функция для поиска категорий затрат по частичному совпадению
-- Ищет в названиях категорий, детализации и локаций
CREATE OR REPLACE FUNCTION public.search_cost_nodes(
    p_search_term text,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    cost_node_id uuid,
    display_name text,
    category_name text,
    detail_name text,
    location_name text,
    category_id uuid,
    detail_id uuid,
    location_id uuid
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Нормализуем поисковый запрос
    p_search_term := LOWER(TRIM(p_search_term));
    
    -- Если поисковый запрос пустой, возвращаем пустой результат
    IF p_search_term = '' OR p_search_term IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH search_results AS (
        SELECT DISTINCT
            -- Используем detail_id как fallback если cost_node не найден
            COALESCE(cn.id, dcc.id) as node_id,
            cc.name as cat_name,
            dcc.name as det_name,
            COALESCE(
                NULLIF(l.country, ''),
                NULLIF(l.city, ''),
                NULLIF(l.title, ''),
                NULLIF(l.code, ''),
                'Локация ' || SUBSTRING(l.id::text FROM 1 FOR 8)
            ) as loc_name,
            cc.id as cat_id,
            dcc.id as det_id,
            l.id as loc_id,
            -- Рассчитываем релевантность для сортировки
            CASE 
                -- Точное совпадение в детализации
                WHEN LOWER(dcc.name) = p_search_term THEN 1
                -- Начинается с поискового запроса в детализации
                WHEN LOWER(dcc.name) LIKE p_search_term || '%' THEN 2
                -- Точное совпадение в категории
                WHEN LOWER(cc.name) = p_search_term THEN 3
                -- Начинается с поискового запроса в категории
                WHEN LOWER(cc.name) LIKE p_search_term || '%' THEN 4
                -- Содержит в детализации
                WHEN LOWER(dcc.name) LIKE '%' || p_search_term || '%' THEN 5
                -- Содержит в категории
                WHEN LOWER(cc.name) LIKE '%' || p_search_term || '%' THEN 6
                -- Содержит в локации
                WHEN LOWER(COALESCE(l.country, l.city, l.title, l.code, '')) LIKE '%' || p_search_term || '%' THEN 7
                ELSE 8
            END as relevance
        FROM 
            public.detail_cost_categories dcc
        INNER JOIN 
            public.cost_categories cc ON cc.id = dcc.cost_category_id
        LEFT JOIN 
            public.location l ON l.id = dcc.location_id
        LEFT JOIN 
            public.cost_nodes cn ON cn.parent_id = cc.id 
                AND cn.name = dcc.name || CASE 
                    WHEN l.country IS NOT NULL THEN ' (' || l.country || ')'
                    WHEN l.city IS NOT NULL THEN ' (' || l.city || ')'
                    WHEN l.title IS NOT NULL THEN ' (' || l.title || ')'
                    ELSE ' (ID: ' || SUBSTRING(dcc.id::text FROM 1 FOR 8) || ')'
                END
        WHERE 
            -- Поиск по всем полям
            LOWER(cc.name) LIKE '%' || p_search_term || '%'
            OR LOWER(dcc.name) LIKE '%' || p_search_term || '%'
            OR LOWER(COALESCE(l.country, '')) LIKE '%' || p_search_term || '%'
            OR LOWER(COALESCE(l.city, '')) LIKE '%' || p_search_term || '%'
            OR LOWER(COALESCE(l.title, '')) LIKE '%' || p_search_term || '%'
            OR LOWER(COALESCE(l.code, '')) LIKE '%' || p_search_term || '%'
            -- Также ищем по коду категории если есть
            OR LOWER(COALESCE(cc.code, '')) LIKE '%' || p_search_term || '%'
    )
    SELECT 
        node_id as cost_node_id,
        cat_name || ' → ' || det_name || ' → ' || loc_name as display_name,
        cat_name as category_name,
        det_name as detail_name,
        loc_name as location_name,
        cat_id as category_id,
        det_id as detail_id,
        loc_id as location_id
    FROM 
        search_results
    ORDER BY 
        relevance,
        cat_name,
        det_name,
        loc_name
    LIMIT p_limit;
END;
$$;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION public.search_cost_nodes(text, integer) IS 
'Поиск категорий затрат по частичному совпадению в названиях категорий, детализации и локаций. 
Возвращает cost_node_id (или detail_id как fallback), полное отображаемое имя и компоненты пути.';

-- Создаем обычные индексы для ускорения поиска если их еще нет
DO $$
BEGIN
    -- Индекс для поиска по названию категории
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'cost_categories' 
        AND indexname = 'idx_cost_categories_name_lower'
    ) THEN
        CREATE INDEX idx_cost_categories_name_lower 
        ON public.cost_categories (LOWER(name));
    END IF;
    
    -- Индекс для поиска по названию детализации
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'detail_cost_categories' 
        AND indexname = 'idx_detail_cost_categories_name_lower'
    ) THEN
        CREATE INDEX idx_detail_cost_categories_name_lower 
        ON public.detail_cost_categories (LOWER(name));
    END IF;
    
    -- Индексы для поиска по локациям
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'location' 
        AND indexname = 'idx_location_country_lower'
    ) THEN
        CREATE INDEX idx_location_country_lower 
        ON public.location (LOWER(country));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'location' 
        AND indexname = 'idx_location_city_lower'
    ) THEN
        CREATE INDEX idx_location_city_lower 
        ON public.location (LOWER(city));
    END IF;
END $$;